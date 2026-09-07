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
SNAPSHOT_SCHEMA_VERSION = 1
RELEASE_META_SCHEMA_VERSION = 1
DEFAULT_GENERATED_AT = date.today().isoformat()
DEFAULT_PUBLISHED_AT = "2026-09-06"
RELEASE_VERSION_PATTERN = re.compile(r"^(\d{8})-v(\d{3})$")
SNAPSHOT_RECORD_FIELDS = {
    "id",
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


def submission_record(row, index, generated_at, converter):
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

    waiting_days = converter.number_value(value(row, "waitingDays", "waiting_days"))
    if status == "Check" and end_date is None:
        waiting_days = converter.days_between(start_date, generated_at)
    elif waiting_days is None:
        if end_date:
            waiting_days = converter.days_between(start_date, end_date)

    raw_id = converter.normalize(value(row, "id")) or str(index)
    record_id = raw_id if raw_id.startswith("submission-") else f"submission-{raw_id}"
    note = converter.normalize(value(row, "note", "detailNote", "detail_note"))
    source = converter.normalize(value(row, "source")) or "submission_user"
    if source not in ALLOWED_SOURCES:
        raise ValueError(f"Unsupported submission source: {source}")
    published_at = converter.date_value(value(row, "publishedAt", "published_at")) or generated_at

    return {
        "id": record_id,
        "location": converter.normalize(value(row, "location")) or "",
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
    converter = load_converter()
    records = converter.convert_records(legacy_input, snapshot_date, published_at, require_case_id=True)
    existing_ids = {record["id"] for record in records}

    if submissions_input:
        snapshot_records = []
        snapshot_ids = set()
        for index, row in enumerate(read_submission_rows(submissions_input), start=1):
            record = submission_record(row, index, generated_at, converter)
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
        _, snapshot_records = read_published_snapshot(published_snapshot)

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
    parser.add_argument("--snapshot-date", default="2026-09-07")
    parser.add_argument("--generated-at", default="2026-09-07")
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
