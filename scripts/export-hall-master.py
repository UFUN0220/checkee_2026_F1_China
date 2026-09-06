"""Merge legacy Excel records and exported published submissions into Hall data."""

from __future__ import annotations

import argparse
import importlib.util
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEGACY_INPUT = ROOT / "data/checkmate/ufun_checkee_pure_processed.xlsx"
DEFAULT_OUTPUT = ROOT / "data/checkmate/hall-master.json"
ALLOWED_SOURCES = {"submission_user", "admin_import"}


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
    if waiting_days is None:
        if end_date:
            waiting_days = converter.days_between(start_date, end_date)
        elif status == "Check":
            waiting_days = converter.days_between(start_date, generated_at)

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


def export_hall_master(legacy_input, submissions_input, output, snapshot_date, generated_at, published_at):
    converter = load_converter()
    records = converter.convert_records(legacy_input, snapshot_date, published_at)
    existing_ids = {record["id"] for record in records}

    if submissions_input:
        for index, row in enumerate(read_submission_rows(submissions_input), start=1):
            record = submission_record(row, index, generated_at, converter)
            if record is None:
                continue
            if record["id"] in existing_ids:
                raise ValueError(f"Duplicate Hall record id: {record['id']}")
            existing_ids.add(record["id"])
            records.append(record)

    dataset = converter.build_dataset(records, snapshot_date, generated_at)
    converter.write_dataset(dataset, output)
    print(f"Exported {len(records)} records to {output}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--legacy-input", type=Path, default=DEFAULT_LEGACY_INPUT)
    parser.add_argument("--submissions", type=Path)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--snapshot-date", default="2026-09-04")
    parser.add_argument("--generated-at", default="2026-09-06")
    parser.add_argument("--published-at", default="2026-09-06")
    args = parser.parse_args()
    export_hall_master(
        args.legacy_input,
        args.submissions,
        args.output,
        args.snapshot_date,
        args.generated_at,
        args.published_at,
    )


if __name__ == "__main__":
    main()
