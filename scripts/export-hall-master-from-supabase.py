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
    parts = urlsplit(base_url.rstrip("/"))
    if parts.scheme != "https" or not parts.netloc:
        raise ValueError("SUPABASE_URL must be an https project URL")
    endpoint = urlunsplit(
        (parts.scheme, parts.netloc, f"{parts.path.rstrip('/')}/rest/v1/{TABLE}", "", "")
    )
    query = urlencode(
        {"select": SELECT_FIELDS, "order": "case_id.asc"},
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
    base_url = os.environ.get("SUPABASE_URL", "").strip()
    api_key = os.environ.get("SUPABASE_SECRET_KEY", "").strip()
    if not base_url or not api_key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required")

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


def map_record(row: dict, snapshot_date: str) -> dict:
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
    return {
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
    }


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
        records = [map_record(row, args.snapshot_date) for row in rows]
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
        print(f"Read {len(records)} rows from public.{TABLE} using GET only")
        print(f"Source counts: {json.dumps(source_counts, ensure_ascii=False, sort_keys=True)}")
        print(f"Wrote master candidate to {args.output}")
        return 0
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Master candidate export failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
