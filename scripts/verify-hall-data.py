"""Verify the generated Hall master dataset and its legacy migration."""

from __future__ import annotations

import argparse
import json
import re
from datetime import date
from pathlib import Path


REQUIRED_FIELDS = {
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
STATUSES = {"Check", "Approved", "Issued", "Refused"}
SOURCES = {"legacy_excel", "submission_user", "admin_import"}
VISIBILITIES = {"draft", "pending", "published", "rejected"}
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def valid_date(value, label):
    if not isinstance(value, str) or not ISO_DATE.fullmatch(value):
        raise ValueError(f"{label} must be YYYY-MM-DD")
    try:
        return date.fromisoformat(value)
    except ValueError as error:
        raise ValueError(f"{label} is not a valid calendar date") from error


def sort_records(records):
    return sorted(
        records,
        key=lambda item: (
            -(item["waitingDays"] if item["waitingDays"] is not None else -1),
            item["startDate"],
        ),
    )


def verify_dataset(dataset):
    if dataset.get("schemaVersion") != 1:
        raise ValueError("schemaVersion must be 1")
    valid_date(dataset.get("generatedAt"), "generatedAt")
    if not dataset.get("sourceDescription"):
        raise ValueError("sourceDescription is required")
    records = dataset.get("records")
    if not isinstance(records, list):
        raise ValueError("records must be an array")
    if dataset.get("recordCount") != len(records):
        raise ValueError("recordCount does not match records length")

    ids = set()
    anomalies = []
    for index, item in enumerate(records, start=1):
        missing = REQUIRED_FIELDS - item.keys()
        if missing:
            raise ValueError(f"Record {index} is missing: {', '.join(sorted(missing))}")
        if item["id"] in ids:
            raise ValueError(f"Duplicate record id: {item['id']}")
        ids.add(item["id"])
        if not item["location"]:
            raise ValueError(f"Record {index} has no location")
        start = valid_date(item["startDate"], f"records[{index}].startDate")
        end = valid_date(item["endDate"], f"records[{index}].endDate") if item["endDate"] else None
        if end and end < start:
            raise ValueError(f"Record {index} has endDate before startDate")
        if item["waitingDays"] is not None and not isinstance(item["waitingDays"], int):
            raise ValueError(f"Record {index}.waitingDays must be an integer or null")
        if item["status"] not in STATUSES:
            raise ValueError(f"Record {index} has invalid status")
        if item["source"] not in SOURCES:
            raise ValueError(f"Record {index} has invalid source")
        if item["visibility"] not in VISIBILITIES:
            raise ValueError(f"Record {index} has invalid visibility")
        if item["publishedAt"]:
            valid_date(item["publishedAt"], f"records[{index}].publishedAt")
        if item["visibility"] == "published" and not item["publishedAt"]:
            raise ValueError(f"Published record {index} must have publishedAt")
        if item["status"] != "Check" and item["endDate"] is None and item["waitingDays"] is not None:
            anomalies.append(f"records[{index}] has waitingDays without endDate for a completed status")
        if item["status"] == "Check" and item["endDate"] is None and item["waitingDays"] is None:
            raise ValueError(f"Check record {index} must have waitingDays when it is still open")

    pending = [item for item in records if item["visibility"] == "pending"]
    if pending:
        raise ValueError("pending records must not be exported into hall-master.json")
    return records, anomalies


def compare_legacy(old_dataset, records):
    old_records = old_dataset.get("records", [])
    if len(old_records) != 97:
        raise ValueError(f"Expected 97 legacy records, found {len(old_records)}")
    by_id = {item["id"]: item for item in records}
    fields = ["id", "location", "degree", "major", "school", "startDate", "endDate", "compactNote", "detailNote", "waitingDays"]
    for old in old_records:
        current = by_id.get(old["id"])
        if current is None:
            raise ValueError(f"Legacy record missing from Hall master: {old['id']}")
        for field in fields:
            if current[field] != old[field]:
                raise ValueError(f"Legacy field mismatch: {old['id']}.{field}")

    def top_three(items):
        return [item["id"] for item in sort_records(items)[:3]]

    if top_three(old_records) != top_three(records):
        raise ValueError("Top 3 changed during migration")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("master", type=Path, nargs="?", default=Path("data/checkmate/hall-master.json"))
    parser.add_argument("--legacy", type=Path, default=Path("data/checkmate/ufun_checkee_pure_processed.json"))
    args = parser.parse_args()
    dataset = load_json(args.master)
    records, anomalies = verify_dataset(dataset)
    compare_legacy(load_json(args.legacy), records)
    sorted_records = sort_records(records)
    print(f"Verified {len(records)} Hall records; published={len(records)}; pending=0")
    print("Top 3: " + ", ".join(f"{item['id']} ({item['waitingDays']})" for item in sorted_records[:3]))
    if anomalies:
        print("Warnings (preserved legacy anomalies):")
        for anomaly in anomalies:
            print(f"- {anomaly}")


if __name__ == "__main__":
    main()
