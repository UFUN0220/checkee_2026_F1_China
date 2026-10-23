"""Export a read-only Hall candidate from public.hall_cases_master.

This comparison utility never writes to Supabase. It maps the master table to
the existing static Hall schema and derives waitingDays from source dates.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen


TABLE = "hall_cases_master"
SUBMISSIONS_TABLE = "case_submissions"
IDENTITY_MIGRATIONS_TABLE = "hall_case_identity_migrations"
PAGE_SIZE = 500
SOURCE_PRIORITY = {"legacy_excel": 0, "submission_user": 1, "admin_import": 2}
LOCATION_VALUES = {"北京", "上海", "广州", "沈阳", "武汉"}
STATUS_VALUES = {"Check", "Approved", "Issued", "Refused"}
SOURCE_VALUES = {"legacy_excel", "submission_user", "admin_import"}
SELECT_FIELDS = (
    "case_id,nickname,location,degree,major,school,interview_date,end_date,"
    "status,note,compact_note,detail_note,source,source_record_id,visibility,published_at,source_order"
)
ISO_DATE_PREFIX = re.compile(r"^(\d{4}-\d{2}-\d{2})")
IDENTITY_MIGRATION_FIELDS = (
    "old_case_id,new_case_id,old_source,new_source,old_source_order,new_source_order,"
    "old_source_record_id,new_source_record_id,migrated_at,migration_batch"
)


def iso_date(value: object, field: str, case_id: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{case_id}: {field} must be a date string or null")
    match = ISO_DATE_PREFIX.match(value)
    if match is None:
        raise ValueError(f"{case_id}: {field} is not an ISO date")
    normalized = match.group(1)
    try:
        date.fromisoformat(normalized)
    except ValueError as error:
        raise ValueError(f"{case_id}: {field} is not a valid calendar date") from error
    return normalized


def optional_text(value: object, field: str, case_id: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{case_id}: {field} must be text or null")
    return value.strip() or None


def request_page(base_url: str, api_key: str, offset: int) -> list[dict]:
    return request_table_page(base_url, api_key, TABLE, SELECT_FIELDS, offset)


def request_table_page(
    base_url: str,
    api_key: str,
    table: str,
    fields: str,
    offset: int,
    filters: dict[str, str] | None = None,
) -> list[dict]:
    parts = urlsplit(base_url.rstrip("/"))
    if parts.scheme != "https" or not parts.netloc:
        raise ValueError("SUPABASE_URL must be an https project URL")
    endpoint = urlunsplit(
        (parts.scheme, parts.netloc, f"{parts.path.rstrip('/')}/rest/v1/{table}", "", "")
    )
    order_column = {
        TABLE: "case_id",
        SUBMISSIONS_TABLE: "id",
        IDENTITY_MIGRATIONS_TABLE: "old_case_id",
    }.get(table)
    if order_column is None:
        raise ValueError(f"Unsupported Supabase table for Hall export: {table}")
    params = {
        "select": fields,
        "order": f"{order_column}.asc",
        **(filters or {}),
    }
    query = urlencode(
        params,
        safe=",.",
    )
    request = Request(
        f"{endpoint}?{query}",
        headers={
            "apikey": api_key,
            "Accept": "application/json",
            "Range-Unit": "items",
            "Range": f"{offset}-{offset + PAGE_SIZE - 1}",
            "User-Agent": "checkee-hall-parity-export/1.0",
        },
        method="GET",
    )
    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        raise RuntimeError(f"Supabase read failed with HTTP {error.code}") from error
    except URLError as error:
        raise RuntimeError(f"Supabase read failed: {error.reason}") from error
    if not isinstance(payload, list) or any(not isinstance(row, dict) for row in payload):
        raise ValueError("Supabase returned an unexpected table response")
    return payload


def fetch_rows() -> list[dict]:
    base_url, api_key = supabase_credentials()

    rows: list[dict] = []
    seen_ids: set[str] = set()
    offset = 0
    while True:
        page = request_page(base_url, api_key, offset)
        for row in page:
            case_id = row.get("case_id")
            if not isinstance(case_id, str) or not case_id.strip():
                raise ValueError("hall_cases_master returned a row without case_id")
            if case_id in seen_ids:
                raise ValueError(f"Duplicate case_id from hall_cases_master: {case_id}")
            seen_ids.add(case_id)
        rows.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += len(page)
    return rows


def supabase_credentials() -> tuple[str, str]:
    base_url = os.environ.get("SUPABASE_URL", "").strip()
    api_key = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
    if not base_url or not api_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required")
    return base_url, api_key


def fetch_published_case_submission_ids() -> set[str]:
    """Return IDs of actual published legacy web submissions, not Master rows."""
    base_url, api_key = supabase_credentials()
    ids: set[str] = set()
    offset = 0
    while True:
        page = request_table_page(
            base_url,
            api_key,
            SUBMISSIONS_TABLE,
            "id,source,visibility",
            offset,
            {"source": "eq.submission_user", "visibility": "eq.published"},
        )
        for row in page:
            raw_id = row.get("id")
            if isinstance(raw_id, bool) or not isinstance(raw_id, int) or raw_id < 1:
                raise ValueError("case_submissions returned an invalid published id")
            if row.get("source") != "submission_user" or row.get("visibility") != "published":
                raise ValueError("case_submissions returned a row outside the published user-submission filter")
            ids.add(str(raw_id))
        if len(page) < PAGE_SIZE:
            break
        offset += len(page)
    return ids


def fetch_identity_migrations() -> list[dict]:
    """Read the authoritative ID map required to classify migrated Legacy rows."""
    base_url, api_key = supabase_credentials()
    mappings: list[dict] = []
    offset = 0
    while True:
        page = request_table_page(
            base_url,
            api_key,
            IDENTITY_MIGRATIONS_TABLE,
            IDENTITY_MIGRATION_FIELDS,
            offset,
        )
        mappings.extend(page)
        if len(page) < PAGE_SIZE:
            break
        offset += len(page)
    return mappings


def validate_identity_migration_mappings(identity_migrations: list[dict]) -> dict[str, dict]:
    """Validate the map's one-to-one identities and return it indexed by new ID."""
    by_new_id: dict[str, dict] = {}
    old_ids: set[str] = set()
    new_order_keys: set[tuple[str, int]] = set()
    new_record_keys: set[tuple[str, str]] = set()
    old_order_keys: set[tuple[str, int]] = set()
    old_record_keys: set[tuple[str, str]] = set()

    if not isinstance(identity_migrations, list):
        raise ValueError("Hall identity migration map must be an array")

    for index, mapping in enumerate(identity_migrations, start=1):
        if not isinstance(mapping, dict):
            raise ValueError(f"Hall identity migration map row {index} must be an object")
        text_fields = (
            "old_case_id",
            "new_case_id",
            "old_source",
            "new_source",
            "old_source_record_id",
            "new_source_record_id",
            "migrated_at",
            "migration_batch",
        )
        for field in text_fields:
            value = mapping.get(field)
            if not isinstance(value, str) or not value.strip():
                raise ValueError(f"Hall identity migration map row {index} has invalid {field}")

        old_order = mapping.get("old_source_order")
        new_order = mapping.get("new_source_order")
        if (
            isinstance(old_order, bool)
            or not isinstance(old_order, int)
            or old_order < 1
            or isinstance(new_order, bool)
            or not isinstance(new_order, int)
            or new_order < 1
        ):
            raise ValueError(f"Hall identity migration map row {index} has invalid source_order")

        old_id = mapping["old_case_id"]
        new_id = mapping["new_case_id"]
        old_source = mapping["old_source"]
        new_source = mapping["new_source"]
        old_record_id = mapping["old_source_record_id"]
        new_record_id = mapping["new_source_record_id"]
        batch = mapping["migration_batch"]
        if old_source != "legacy_excel" or new_source != "submission_user":
            raise ValueError(f"Hall identity migration map row {index} has unsupported source values")
        if old_id == new_id or not new_id.startswith("submission-"):
            raise ValueError(f"Hall identity migration map row {index} has invalid case IDs")
        if new_record_id != f"legacy-migration:{batch}:{old_id}":
            raise ValueError(f"Hall identity migration map row {index} has inconsistent provenance marker")

        new_order_key = (new_source, new_order)
        new_record_key = (new_source, new_record_id)
        old_order_key = (old_source, old_order)
        old_record_key = (old_source, old_record_id)
        if (
            old_id in old_ids
            or new_id in by_new_id
            or new_order_key in new_order_keys
            or new_record_key in new_record_keys
            or old_order_key in old_order_keys
            or old_record_key in old_record_keys
        ):
            raise ValueError(f"Hall identity migration map row {index} duplicates an identity")

        old_ids.add(old_id)
        by_new_id[new_id] = mapping
        new_order_keys.add(new_order_key)
        new_record_keys.add(new_record_key)
        old_order_keys.add(old_order_key)
        old_record_keys.add(old_record_key)

    return by_new_id


def validate_migration_rows(rows: list[dict], identity_migrations: list[dict]) -> dict[str, dict]:
    """Require every migration marker to match the full authoritative map row."""
    mappings_by_new_id = validate_identity_migration_mappings(identity_migrations)
    rows_by_id: dict[str, dict] = {}
    for row in rows:
        case_id = row.get("case_id")
        if not isinstance(case_id, str) or not case_id.strip():
            raise ValueError("hall_cases_master returned a row without case_id")
        if case_id in rows_by_id:
            raise ValueError(f"Duplicate case_id from hall_cases_master: {case_id}")
        rows_by_id[case_id] = row

    for case_id, row in rows_by_id.items():
        source_record_id = row.get("source_record_id")
        mapped_row = mappings_by_new_id.get(case_id)
        carries_migration_marker = isinstance(source_record_id, str) and source_record_id.startswith(
            "legacy-migration:"
        )
        if carries_migration_marker and mapped_row is None:
            raise ValueError(f"{case_id}: legacy migration marker has no matching identity map row")
        if mapped_row is None:
            continue
        expected = (
            mapped_row["new_case_id"],
            mapped_row["new_source"],
            mapped_row["new_source_order"],
            mapped_row["new_source_record_id"],
        )
        actual = (case_id, row.get("source"), row.get("source_order"), source_record_id)
        if actual != expected:
            raise ValueError(f"{case_id}: Master identity does not match its migration map row")

    return mappings_by_new_id


def classify_submission_origin(
    case_id: str,
    source_record_id: str,
    real_submission_ids: set[str],
    identity_migrations: list[dict] | None = None,
    source_order: int | None = None,
) -> str:
    """Classify by stable source_record_id semantics, never by source alone."""
    if source_record_id.startswith("legacy-migration:"):
        mappings_by_new_id = validate_identity_migration_mappings(identity_migrations or [])
        mapping = mappings_by_new_id.get(case_id)
        if mapping is None:
            raise ValueError(f"{case_id}: legacy migration marker has no matching identity map row")
        if source_order != mapping["new_source_order"]:
            raise ValueError(f"{case_id}: source_order does not match its identity map row")
        if source_record_id != mapping["new_source_record_id"]:
            raise ValueError(f"{case_id}: source_record_id does not match its identity map row")
        return "legacy_migration"
    if source_record_id.startswith("master:"):
        allocated_id = source_record_id.removeprefix("master:")
        if not allocated_id.isdigit() or case_id != f"submission-{allocated_id}":
            raise ValueError(f"{case_id}: malformed direct Master submission provenance")
        return "master_submission"
    if source_record_id.isdigit() and case_id == f"submission-{source_record_id}":
        if source_record_id in real_submission_ids:
            return "legacy_case_submission"
        raise ValueError(f"{case_id}: no matching published case_submissions row")
    raise ValueError(f"{case_id}: unrecognized submission_user provenance")


def published_rows(rows: list[dict]) -> tuple[list[dict], dict[str, int]]:
    counts: dict[str, int] = {}
    selected = []
    for row in rows:
        visibility = row.get("visibility")
        if visibility not in {"pending", "published", "rejected"}:
            raise ValueError(f"{row.get('case_id', 'unknown')}: unsupported Master visibility {visibility!r}")
        counts[visibility] = counts.get(visibility, 0) + 1
        if visibility == "published":
            selected.append(row)
    return selected, counts


def real_submission_snapshot_records(records: list[dict]) -> list[dict]:
    return [
        record
        for record in records
        if record.get("submissionOrigin") in {"legacy_case_submission", "master_submission"}
    ]


def migration_identity_count(records: list[dict]) -> int:
    return sum(record.get("submissionOrigin") == "legacy_migration" for record in records)


def map_record(
    row: dict,
    snapshot_date: str,
    real_submission_ids: set[str] | None = None,
    identity_migrations: list[dict] | None = None,
) -> dict:
    case_id = row["case_id"].strip()
    location = optional_text(row.get("location"), "location", case_id)
    degree = optional_text(row.get("degree"), "degree", case_id)
    major = optional_text(row.get("major"), "major", case_id)
    status = optional_text(row.get("status"), "status", case_id)
    source = optional_text(row.get("source"), "source", case_id)
    visibility = optional_text(row.get("visibility"), "visibility", case_id)
    source_order = row.get("source_order")
    start_date = iso_date(row.get("interview_date"), "interview_date", case_id)
    end_date = iso_date(row.get("end_date"), "end_date", case_id)
    published_at = iso_date(row.get("published_at"), "published_at", case_id)

    if location not in LOCATION_VALUES:
        raise ValueError(f"{case_id}: unexpected canonical location {location!r}")
    if not degree:
        raise ValueError(f"{case_id}: degree is empty")
    if not status or status not in STATUS_VALUES:
        raise ValueError(f"{case_id}: unexpected status {status!r}")
    if not source or source not in SOURCE_VALUES:
        raise ValueError(f"{case_id}: unexpected source {source!r}")
    if isinstance(source_order, bool) or not isinstance(source_order, int) or source_order < 1:
        raise ValueError(f"{case_id}: source_order must be a positive integer")
    if visibility != "published":
        raise ValueError(f"{case_id}: non-published row found in master")
    if not start_date or not published_at:
        raise ValueError(f"{case_id}: required date is missing")
    if end_date and end_date < start_date:
        raise ValueError(f"{case_id}: end_date precedes interview_date")

    waiting_days = (date.fromisoformat(end_date or snapshot_date) - date.fromisoformat(start_date)).days
    record = {
        "id": case_id,
        "nickname": optional_text(row.get("nickname"), "nickname", case_id),
        "location": location,
        "degree": degree,
        "major": major or "",
        "school": optional_text(row.get("school"), "school", case_id),
        "startDate": start_date,
        "endDate": end_date,
        "waitingDays": waiting_days,
        "status": status,
        "note": optional_text(row.get("note"), "note", case_id),
        "compactNote": optional_text(row.get("compact_note"), "compact_note", case_id),
        "detailNote": optional_text(row.get("detail_note"), "detail_note", case_id),
        "publishedAt": published_at,
        "source": source,
        "visibility": visibility,
        "_sourceOrder": source_order,
        "_sourceRecordId": optional_text(row.get("source_record_id"), "source_record_id", case_id),
    }
    if source == "submission_user":
        source_record_id = record["_sourceRecordId"]
        if not source_record_id:
            raise ValueError(f"{case_id}: submission_user row has no source_record_id")
        record["submissionOrigin"] = classify_submission_origin(
            case_id,
            source_record_id,
            real_submission_ids or set(),
            identity_migrations,
            source_order,
        )
    return record


def validate_source_order_uniqueness(records: list[dict]) -> None:
    seen: dict[tuple[str, int], str] = {}
    for record in records:
        key = (record["source"], record["_sourceOrder"])
        previous_case_id = seen.get(key)
        if previous_case_id is not None:
            raise ValueError(
                "Duplicate (source, source_order) in hall_cases_master: "
                f"{key[0]} / {key[1]} used by {previous_case_id} and {record['id']}"
            )
        seen[key] = record["id"]


def cli_snapshot_date(value: str) -> str:
    try:
        date.fromisoformat(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("snapshot-date must be a valid YYYY-MM-DD date") from error
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise argparse.ArgumentTypeError("snapshot-date must be YYYY-MM-DD")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot-date", type=cli_snapshot_date, required=True)
    parser.add_argument("--generated-at", type=cli_snapshot_date, required=True)
    parser.add_argument("--data-version", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    try:
        rows = fetch_rows()
        identity_migrations = fetch_identity_migrations()
        validate_migration_rows(rows, identity_migrations)
        real_submission_ids = fetch_published_case_submission_ids()
        published, visibility_counts = published_rows(rows)
        records = [
            map_record(row, args.snapshot_date, real_submission_ids, identity_migrations)
            for row in published
        ]
        validate_source_order_uniqueness(records)
        records.sort(key=lambda record: (SOURCE_PRIORITY[record["source"]], record["_sourceOrder"]))
        for record in records:
            record.pop("_sourceOrder")
        dataset = {
            "schemaVersion": 1,
            "dataVersion": args.data_version,
            "generatedAt": args.generated_at,
            "sourceDescription": "UFUN Hall curated visa cases",
            "sourceName": "hall_fame.xlsx",
            "snapshotDate": args.snapshot_date,
            "recordCount": len(records),
            "records": records,
        }
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        source_counts = {
            source: sum(record["source"] == source for record in records)
            for source in ("legacy_excel", "submission_user", "admin_import")
        }
        print(
            f"Read {len(rows)} rows from public.{TABLE}; "
            f"published={visibility_counts.get('published', 0)}; "
            f"pending={visibility_counts.get('pending', 0)}; "
            f"rejected={visibility_counts.get('rejected', 0)} using GET only"
        )
        print(f"Source counts: {json.dumps(source_counts, ensure_ascii=False, sort_keys=True)}")
        print(f"Wrote master candidate to {args.output}")
        return 0
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Master candidate export failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
