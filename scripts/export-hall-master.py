"""Freeze published submissions, then merge the frozen data into Hall data.

The Supabase export is deliberately treated as an input to this development-time
utility.  The checked-in published-submissions.json file is the stable boundary
between the dynamic review database and the generated Hall master dataset.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
import shutil
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEGACY_INPUT = ROOT / "data/checkmate/hall_fame.xlsx"
DEFAULT_PUBLISHED_SNAPSHOT = ROOT / "data/checkmate/published-submissions.json"
DEFAULT_RELEASES_DIR = ROOT / "data/checkmate/releases"
DEFAULT_OUTPUT = ROOT / "data/checkmate/hall-master.json"
ALLOWED_SOURCES = {"submission_user", "admin_import"}
SUBMISSION_LOCATION_ALIASES = {
    "beijing": "北京",
    "北京": "北京",
    "shanghai": "上海",
    "上海": "上海",
    "guangzhou": "广州",
    "广州": "广州",
    "shenyang": "沈阳",
    "沈阳": "沈阳",
    "wuhan": "武汉",
    "武汉": "武汉",
}
SNAPSHOT_SCHEMA_VERSION = 1
RELEASE_META_SCHEMA_VERSION = 1
DEFAULT_SNAPSHOT_DATE = date.today().isoformat()
DEFAULT_GENERATED_AT = DEFAULT_SNAPSHOT_DATE
DEFAULT_PUBLISHED_AT = "2026-09-06"
ISO_DATE_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}$")
RELEASE_VERSION_PATTERN = re.compile(r"^(\d{8})-v(\d{3})$")
SNAPSHOT_RECORD_FIELDS = {
    "id",
    "nickname",
    "location",
    "degree",
    "major",
    "school",
    "startDate",
    "endDate",
    "waitingDays",
    "status",
    "note",
    "compactNote",
    "detailNote",
    "publishedAt",
    "source",
    "visibility",
}


def load_converter():
    path = Path(__file__).with_name("convert-checkee-data.py")
    spec = importlib.util.spec_from_file_location("convert_checkee_data", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load converter: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_iso_date(value, label):
    if not isinstance(value, str) or not ISO_DATE_PATTERN.fullmatch(value):
        raise ValueError(f"{label} must be YYYY-MM-DD")
    try:
        date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"{label} is not a valid calendar date") from error
    return value


def snapshot_date_argument(value):
    try:
        return validate_iso_date(value, "snapshot-date")
    except ValueError as error:
        raise argparse.ArgumentTypeError(str(error)) from error


def read_submission_rows(path: Path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    if isinstance(payload, dict):
        rows = payload.get("records", payload.get("data"))
        if isinstance(rows, list):
            return rows
    raise ValueError("Submission export must be an array or an object containing records/data")


def read_published_snapshot(path: Path):
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("Published submissions snapshot must be an object")
    if payload.get("schemaVersion") != SNAPSHOT_SCHEMA_VERSION:
        raise ValueError("Published submissions snapshot schemaVersion must be 1")
    generated_at = payload.get("generatedAt")
    if not isinstance(generated_at, str) or not generated_at:
        raise ValueError("Published submissions snapshot generatedAt is required")
    records = payload.get("records")
    if not isinstance(records, list):
        raise ValueError("Published submissions snapshot records must be an array")

    ids = set()
    for index, record in enumerate(records, start=1):
        if not isinstance(record, dict):
            raise ValueError(f"Published snapshot record {index} must be an object")
        missing = SNAPSHOT_RECORD_FIELDS - record.keys()
        extra = record.keys() - SNAPSHOT_RECORD_FIELDS
        if missing or extra:
            details = []
            if missing:
                details.append("missing: " + ", ".join(sorted(missing)))
            if extra:
                details.append("unexpected: " + ", ".join(sorted(extra)))
            raise ValueError(f"Published snapshot record {index} schema mismatch ({'; '.join(details)})")
        if record.get("visibility") != "published":
            raise ValueError(f"Published snapshot record {index} must be published")
        record_id = record.get("id")
        if not isinstance(record_id, str) or not record_id:
            raise ValueError(f"Published snapshot record {index} must have a string id")
        if record_id in ids:
            raise ValueError(f"Duplicate published snapshot id: {record_id}")
        ids.add(record_id)
    return generated_at, records


def build_published_snapshot(records, generated_at):
    return {
        "schemaVersion": SNAPSHOT_SCHEMA_VERSION,
        "generatedAt": generated_at,
        "records": records,
    }


def next_release_version(releases_dir: Path, generated_at: str):
    try:
        release_date = date.fromisoformat(generated_at)
    except ValueError as error:
        raise ValueError("generated-at must be YYYY-MM-DD to create a release version") from error

    date_prefix = release_date.strftime("%Y%m%d")
    highest = 0
    if releases_dir.exists():
        for path in releases_dir.iterdir():
            if not path.is_dir():
                continue
            match = RELEASE_VERSION_PATTERN.fullmatch(path.name)
            if match and match.group(1) == date_prefix:
                highest = max(highest, int(match.group(2)))

    sequence = highest + 1
    if sequence > 999:
        raise ValueError(f"No release version slots remain for {date_prefix}")
    return f"{date_prefix}-v{sequence:03d}"


def release_sources(records):
    source_order = ("legacy_excel", "submission_user", "admin_import")
    actual_sources = {record["source"] for record in records}
    return [source for source in source_order if source in actual_sources]


def build_release_meta(version, generated_at, legacy_records, snapshot_records, hall_records):
    return {
        "version": version,
        "generatedAt": generated_at,
        "schemaVersion": RELEASE_META_SCHEMA_VERSION,
        "legacyCount": len(legacy_records),
        "submissionCount": len(snapshot_records),
        "totalCount": len(hall_records),
        "source": release_sources(hall_records),
    }


def write_release(release_dir, hall_dataset, release_meta, snapshot_path):
    release_dir.mkdir(parents=True, exist_ok=False)
    converter = load_converter()
    converter.write_dataset(hall_dataset, release_dir / "hall-master.json")
    shutil.copyfile(snapshot_path, release_dir / "published-submissions.json")
    (release_dir / "release-meta.json").write_text(
        json.dumps(release_meta, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def value(row, *names):
    for name in names:
        if name in row:
            return row[name]
    return None


def normalize_submission_status(status, end_date):
    if status == "Refused" and end_date is None:
        return "Check"
    return status


def normalize_submission_location(value, converter, index):
    normalized = converter.normalize(value)
    if normalized is None:
        raise ValueError(f"Published submission row {index} has no location")
    canonical = SUBMISSION_LOCATION_ALIASES.get(normalized)
    if canonical is None:
        canonical = SUBMISSION_LOCATION_ALIASES.get(normalized.lower())
    if canonical is None:
        raise ValueError(f"Published submission row {index} has unknown location: {normalized}")
    return canonical


def submission_record(row, index, snapshot_date, generated_at, converter):
    if not isinstance(row, dict):
        raise ValueError(f"Submission row {index} must be an object")
    visibility = converter.normalize(value(row, "visibility"))
    if visibility != "published":
        return None

    status = converter.canonical_status(value(row, "status"))
    if not status:
        raise ValueError(f"Published submission row {index} has no valid status")
    start_date = converter.date_value(value(row, "startDate", "interview_date", "start_date"))
    if not start_date:
        raise ValueError(f"Published submission row {index} has no start date")
    end_date = converter.date_value(value(row, "endDate", "end_date"))
    if end_date and end_date < start_date:
        raise ValueError(f"Published submission row {index} has an end date before its start date")
    status = normalize_submission_status(status, end_date)
    location = normalize_submission_location(value(row, "location"), converter, index)

    waiting_days = converter.derived_waiting_days(start_date, end_date, snapshot_date)

    raw_id = converter.normalize(value(row, "id")) or str(index)
    record_id = raw_id if raw_id.startswith("submission-") else f"submission-{raw_id}"
    note = converter.normalize(value(row, "note", "detailNote", "detail_note"))
    source = converter.normalize(value(row, "source")) or "submission_user"
    if source not in ALLOWED_SOURCES:
        raise ValueError(f"Unsupported submission source: {source}")
    published_at = converter.date_value(value(row, "publishedAt", "published_at")) or generated_at

    return {
        "id": record_id,
        "nickname": converter.normalize(value(row, "nickname", "name")),
        "location": location,
        "degree": converter.normalize(value(row, "degree")) or "",
        "major": converter.normalize(value(row, "major")) or "",
        "school": converter.normalize(value(row, "school")),
        "startDate": start_date,
        "endDate": end_date,
        "waitingDays": waiting_days,
        "status": status,
        "note": note,
        "publishedAt": published_at,
        "source": source,
        "visibility": "published",
        "compactNote": converter.normalize(value(row, "compactNote", "compact_note")) or converter.compact_note(note),
        "detailNote": note,
    }


def with_derived_waiting_days(record, snapshot_date, converter):
    start_date = converter.date_value(record.get("startDate"))
    end_date = converter.date_value(record.get("endDate"))
    if not start_date:
        raise ValueError(f"Published snapshot record {record.get('id', 'unknown')} has no start date")
    if end_date and end_date < start_date:
        raise ValueError(f"Published snapshot record {record.get('id', 'unknown')} has an end date before its start date")
    status = normalize_submission_status(record.get("status"), end_date)
    location = normalize_submission_location(record.get("location"), converter, record.get("id", "unknown"))

    return {
        **record,
        "startDate": start_date,
        "endDate": end_date,
        "waitingDays": converter.derived_waiting_days(start_date, end_date, snapshot_date),
        "status": status,
        "location": location,
    }


def export_hall_master(
    legacy_input,
    submissions_input,
    output,
    snapshot_date,
    generated_at,
    published_at,
    published_snapshot=DEFAULT_PUBLISHED_SNAPSHOT,
    releases_dir=DEFAULT_RELEASES_DIR,
):
    snapshot_date = validate_iso_date(snapshot_date, "snapshot-date")
    converter = load_converter()
    legacy_warnings = []
    records = converter.convert_records(
        legacy_input,
        snapshot_date,
        published_at,
        require_case_id=True,
        warnings=legacy_warnings,
    )
    for warning in legacy_warnings:
        print(f"Warning: {warning}")
    existing_ids = {record["id"] for record in records}

    if submissions_input:
        snapshot_records = []
        snapshot_ids = set()
        for index, row in enumerate(read_submission_rows(submissions_input), start=1):
            record = submission_record(row, index, snapshot_date, generated_at, converter)
            if record is None:
                continue
            if record["id"] in existing_ids:
                raise ValueError(f"Duplicate Hall record id: {record['id']}")
            if record["id"] in snapshot_ids:
                raise ValueError(f"Duplicate published submission id: {record['id']}")
            snapshot_ids.add(record["id"])
            snapshot_records.append(record)
        converter.write_dataset(build_published_snapshot(snapshot_records, generated_at), published_snapshot)
        print(f"Froze {len(snapshot_records)} published submissions to {published_snapshot}")
    else:
        snapshot_generated_at, frozen_snapshot_records = read_published_snapshot(published_snapshot)
        snapshot_records = [
            with_derived_waiting_days(record, snapshot_date, converter)
            for record in frozen_snapshot_records
        ]
        if any(
            normalized["status"] != original.get("status")
            for original, normalized in zip(frozen_snapshot_records, snapshot_records)
        ):
            converter.write_dataset(
                build_published_snapshot(snapshot_records, snapshot_generated_at),
                published_snapshot,
            )
            print(f"Normalized published submission statuses in {published_snapshot}")

    for record in snapshot_records:
        if record["id"] in existing_ids:
            raise ValueError(f"Duplicate Hall record id: {record['id']}")
        existing_ids.add(record["id"])
        records.append(record)

    version = next_release_version(releases_dir, generated_at)
    dataset_without_version = converter.build_dataset(
        records,
        snapshot_date,
        generated_at,
        source_name=legacy_input.name,
    )
    dataset = {
        "schemaVersion": dataset_without_version["schemaVersion"],
        "dataVersion": version,
        **{key: value for key, value in dataset_without_version.items() if key != "schemaVersion"},
    }
    release_meta = build_release_meta(
        version,
        generated_at,
        [record for record in records if record["source"] == "legacy_excel"],
        snapshot_records,
        records,
    )
    release_dir = releases_dir / version
    write_release(
        release_dir,
        dataset,
        release_meta,
        published_snapshot,
    )
    converter.write_dataset(dataset, output)
    print(f"Created release {version} at {release_dir}")
    print(f"Exported {len(records)} records to {output}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-input", type=Path, default=DEFAULT_LEGACY_INPUT)
    parser.add_argument(
        "--submissions",
        type=Path,
        help="A fresh JSON export from Supabase; published rows are frozen into the snapshot",
    )
    parser.add_argument(
        "--published-snapshot",
        type=Path,
        default=DEFAULT_PUBLISHED_SNAPSHOT,
        help="The frozen published submissions snapshot used when --submissions is omitted",
    )
    parser.add_argument("--releases-dir", type=Path, default=DEFAULT_RELEASES_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--snapshot-date",
        type=snapshot_date_argument,
        default=DEFAULT_SNAPSHOT_DATE,
        help="The release cutoff date used to derive open-record waitingDays (default: today)",
    )
    parser.add_argument("--generated-at", default=DEFAULT_GENERATED_AT)
    parser.add_argument("--published-at", default="2026-09-06")
    args = parser.parse_args()
    export_hall_master(
        args.legacy_input,
        args.submissions,
        args.output,
        args.snapshot_date,
        args.generated_at,
        args.published_at,
        args.published_snapshot,
        args.releases_dir,
    )


if __name__ == "__main__":
    main()
