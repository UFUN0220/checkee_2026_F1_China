"""Verify the published snapshot, generated Hall master, and legacy migration."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEGACY_INPUT = Path("data/checkmate/hall_fame.xlsx")
DEFAULT_PREVIOUS_LEGACY = Path("data/checkmate/ufun_checkee_pure_processed.json")


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
RELEASE_VERSION = re.compile(r"^\d{8}-v\d{3}$")
RELEASE_FILES = ("hall-master.json", "published-submissions.json", "release-meta.json")
COMPARISON_FIELDS = (
    "id",
    "nickname",
    "location",
    "degree",
    "major",
    "school",
    "startDate",
    "endDate",
    "waitingDays",
    "compactNote",
    "detailNote",
)


def load_converter():
    path = ROOT / "scripts" / "convert-checkee-data.py"
    spec = importlib.util.spec_from_file_location("convert_checkee_data", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load converter: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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


def verify_dataset(dataset, verify_waiting_days=True, require_nickname=True):
    if not isinstance(dataset, dict):
        raise ValueError("Hall dataset must be an object")
    if dataset.get("schemaVersion") != 1:
        raise ValueError("schemaVersion must be 1")
    data_version = dataset.get("dataVersion")
    if not isinstance(data_version, str) or not RELEASE_VERSION.fullmatch(data_version):
        raise ValueError("dataVersion must match YYYYMMDD-vXXX")
    valid_date(dataset.get("generatedAt"), "generatedAt")
    snapshot_date = valid_date(dataset.get("snapshotDate"), "snapshotDate")
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
        if not isinstance(item, dict):
            raise ValueError(f"Record {index} must be an object")
        missing = REQUIRED_FIELDS - item.keys()
        if missing:
            raise ValueError(f"Record {index} is missing: {', '.join(sorted(missing))}")
        if item["id"] in ids:
            raise ValueError(f"Duplicate record id: {item['id']}")
        ids.add(item["id"])
        if require_nickname and "nickname" not in item:
            raise ValueError(f"Record {index} is missing: nickname")
        if "nickname" in item and item["nickname"] is not None and not isinstance(item["nickname"], str):
            raise ValueError(f"Record {index}.nickname must be a string or null")
        if not item["location"]:
            raise ValueError(f"Record {index} has no location")
        start = valid_date(item["startDate"], f"records[{index}].startDate")
        end = valid_date(item["endDate"], f"records[{index}].endDate") if item["endDate"] else None
        if end and end < start:
            raise ValueError(f"Record {index} has endDate before startDate")
        if item["waitingDays"] is not None and not isinstance(item["waitingDays"], int):
            raise ValueError(f"Record {index}.waitingDays must be an integer or null")
        expected_waiting_days = ((end or snapshot_date) - start).days
        if verify_waiting_days and item["waitingDays"] != expected_waiting_days:
            raise ValueError(
                f"Record {index}.waitingDays must equal "
                f"{'endDate' if end else 'snapshotDate'} minus startDate"
            )
        if item["status"] not in STATUSES:
            raise ValueError(f"Record {index} has invalid status")
        if item["source"] not in SOURCES:
            raise ValueError(f"Record {index} has invalid source")
        if item["visibility"] not in VISIBILITIES:
            raise ValueError(f"Record {index} has invalid visibility")
        if item["visibility"] != "published":
            raise ValueError(f"Record {index} is not published and must not enter hall-master.json")
        if item["publishedAt"]:
            valid_date(item["publishedAt"], f"records[{index}].publishedAt")
        if item["visibility"] == "published" and not item["publishedAt"]:
            raise ValueError(f"Published record {index} must have publishedAt")
    return records, anomalies


def verify_published_snapshot(snapshot, require_nickname=True):
    if not isinstance(snapshot, dict):
        raise ValueError("published-submissions.json must contain an object")
    if snapshot.get("schemaVersion") != 1:
        raise ValueError("published-submissions.json schemaVersion must be 1")
    valid_date(snapshot.get("generatedAt"), "published-submissions.generatedAt")
    records = snapshot.get("records")
    if not isinstance(records, list):
        raise ValueError("published-submissions.records must be an array")

    ids = set()
    for index, item in enumerate(records, start=1):
        if not isinstance(item, dict):
            raise ValueError(f"published-submissions.records[{index}] must be an object")
        missing = REQUIRED_FIELDS - item.keys()
        if require_nickname and "nickname" not in item:
            missing = missing | {"nickname"}
        extra = item.keys() - (REQUIRED_FIELDS | {"nickname"})
        if missing or extra:
            details = []
            if missing:
                details.append("missing: " + ", ".join(sorted(missing)))
            if extra:
                details.append("unexpected: " + ", ".join(sorted(extra)))
            raise ValueError(f"published-submissions.records[{index}] schema mismatch ({'; '.join(details)})")
        if item["id"] in ids:
            raise ValueError(f"Duplicate published submission id: {item['id']}")
        ids.add(item["id"])
        if "nickname" in item and item["nickname"] is not None and not isinstance(item["nickname"], str):
            raise ValueError(f"published-submissions.records[{index}].nickname must be a string or null")
        if item["visibility"] != "published":
            raise ValueError(f"published-submissions.records[{index}] must be published")

    return records


def compare_legacy(expected_records, records):
    current_legacy = [item for item in records if item["source"] == "legacy_excel"]
    if len(current_legacy) != len(expected_records):
        raise ValueError(
            f"Legacy record count mismatch: expected {len(expected_records)}, found {len(current_legacy)}"
        )
    for expected, current in zip(expected_records, current_legacy):
        for field in COMPARISON_FIELDS:
            if current.get(field) != expected.get(field):
                raise ValueError(f"Legacy field mismatch: {expected['id']}.{field}")

    def top_three(items):
        return [item["id"] for item in sort_records(items)[:3]]

    if top_three(expected_records) != top_three(current_legacy):
        raise ValueError("Top 3 changed while exporting the new legacy source")


def comparable_field(record, field):
    value = record.get(field)
    return None if field == "nickname" and value == "" else value


def report_legacy_changes(previous_dataset, current_records):
    previous_records = previous_dataset.get("records", [])
    previous_by_id = {item["id"]: item for item in previous_records}
    current_by_id = {item["id"]: item for item in current_records}
    added = sorted(set(current_by_id) - set(previous_by_id))
    removed = sorted(set(previous_by_id) - set(current_by_id))
    changed = sorted(
        record_id
        for record_id in set(previous_by_id) & set(current_by_id)
        if any(
            comparable_field(previous_by_id[record_id], field)
            != comparable_field(current_by_id[record_id], field)
            for field in COMPARISON_FIELDS
        )
    )

    def top_three(items):
        return [item["id"] for item in sort_records(items)[:3]]

    print(f"Legacy source comparison: previous={len(previous_records)} current={len(current_records)}")
    print(f"Added: {len(added)}; Removed: {len(removed)}; Changed: {len(changed)}")
    print("Previous Top 3: " + ", ".join(top_three(previous_records)))
    print("Current Top 3: " + ", ".join(top_three(current_records)))
    if added:
        print("Added IDs: " + ", ".join(added))
    if removed:
        print("Removed IDs: " + ", ".join(removed))
    if changed:
        print("Changed IDs: " + ", ".join(changed))


def compare_published_snapshot(snapshot_records, legacy_records, hall_records, snapshot_date):
    legacy_ids = {item["id"] for item in legacy_records}
    snapshot_ids = {item["id"] for item in snapshot_records}
    if legacy_ids & snapshot_ids:
        duplicate = sorted(legacy_ids & snapshot_ids)[0]
        raise ValueError(f"Published snapshot id overlaps legacy record: {duplicate}")

    hall_ids = {item["id"] for item in hall_records}
    expected_ids = legacy_ids | snapshot_ids
    missing = expected_ids - hall_ids
    extra = hall_ids - expected_ids
    if missing:
        raise ValueError(f"Hall master is missing merged record: {sorted(missing)[0]}")
    if extra:
        raise ValueError(f"Hall master contains an unexpected record: {sorted(extra)[0]}")
    if len(hall_records) - len(legacy_records) != len(snapshot_records):
        raise ValueError(
            "Hall merge count changed unexpectedly: "
            f"legacy={len(legacy_records)}, snapshot={len(snapshot_records)}, hall={len(hall_records)}"
        )

    by_id = {item["id"]: item for item in hall_records}
    for snapshot_record in snapshot_records:
        start = valid_date(snapshot_record["startDate"], f"published snapshot {snapshot_record['id']}.startDate")
        end = (
            valid_date(snapshot_record["endDate"], f"published snapshot {snapshot_record['id']}.endDate")
            if snapshot_record["endDate"]
            else None
        )
        expected_record = {
            **snapshot_record,
            "waitingDays": ((end or snapshot_date) - start).days,
        }
        if by_id[snapshot_record["id"]] != expected_record:
            raise ValueError(f"Published snapshot record differs in Hall master: {snapshot_record['id']}")


def release_sort_key(path):
    match = RELEASE_VERSION.fullmatch(path.name)
    if not match:
        raise ValueError(f"Invalid release directory name: {path.name}")
    return path.name


def verify_release_meta(meta, release_dir, snapshot_records, hall_records):
    if not isinstance(meta, dict):
        raise ValueError(f"{release_dir.name}/release-meta.json must contain an object")
    if meta.get("schemaVersion") != 1:
        raise ValueError(f"{release_dir.name} release-meta schemaVersion must be 1")
    if meta.get("version") != release_dir.name or not RELEASE_VERSION.fullmatch(meta.get("version", "")):
        raise ValueError(f"{release_dir.name} release-meta version is invalid")
    valid_date(meta.get("generatedAt"), f"{release_dir.name}.generatedAt")

    legacy_count = sum(record["source"] == "legacy_excel" for record in hall_records)
    expected_sources = [
        source
        for source in ("legacy_excel", "submission_user", "admin_import")
        if any(record["source"] == source for record in hall_records)
    ]
    expected_counts = {
        "legacyCount": legacy_count,
        "submissionCount": len(snapshot_records),
        "totalCount": len(hall_records),
    }
    for field, expected in expected_counts.items():
        if meta.get(field) != expected:
            raise ValueError(f"{release_dir.name} {field} does not match release contents")
    if meta.get("source") != expected_sources:
        raise ValueError(f"{release_dir.name} source does not match release contents")
    if len(hall_records) != legacy_count + len(snapshot_records):
        raise ValueError(f"{release_dir.name} total count does not equal legacy plus submissions")

    hall_by_id = {record["id"]: record for record in hall_records}
    for snapshot_record in snapshot_records:
        if snapshot_record["id"] not in hall_by_id:
            raise ValueError(f"{release_dir.name} is missing snapshot record {snapshot_record['id']}")
        if hall_by_id[snapshot_record["id"]] != snapshot_record:
            raise ValueError(f"{release_dir.name} snapshot record differs from Hall master")


def verify_release_history(releases_dir, current_master, current_snapshot):
    if not releases_dir.is_dir():
        raise ValueError(f"Release directory does not exist: {releases_dir}")
    release_dirs = [path for path in releases_dir.iterdir() if path.is_dir()]
    if not release_dirs:
        raise ValueError("No Hall releases found")
    for path in release_dirs:
        release_sort_key(path)

    seen_versions = set()
    for release_dir in sorted(release_dirs, key=release_sort_key):
        missing_files = [name for name in RELEASE_FILES if not (release_dir / name).is_file()]
        if missing_files:
            raise ValueError(f"{release_dir.name} is missing: {', '.join(missing_files)}")

        meta = load_json(release_dir / "release-meta.json")
        version = meta.get("version") if isinstance(meta, dict) else None
        if version in seen_versions:
            raise ValueError(f"Duplicate release version: {version}")
        seen_versions.add(version)

        snapshot_records = verify_published_snapshot(
            load_json(release_dir / "published-submissions.json"),
            require_nickname=False,
        )
        hall_records, _ = verify_dataset(
            load_json(release_dir / "hall-master.json"),
            verify_waiting_days=False,
            require_nickname=False,
        )
        verify_release_meta(meta, release_dir, snapshot_records, hall_records)
        release_hall = load_json(release_dir / "hall-master.json")
        if release_hall.get("dataVersion") != release_dir.name:
            raise ValueError(f"{release_dir.name} Hall master dataVersion does not match directory")
        if release_hall.get("generatedAt") != meta.get("generatedAt"):
            raise ValueError(f"{release_dir.name} generatedAt does not match release-meta.json")

    latest_dir = max(release_dirs, key=release_sort_key)
    latest_hall = load_json(latest_dir / "hall-master.json")
    latest_snapshot = load_json(latest_dir / "published-submissions.json")
    if latest_hall != current_master:
        raise ValueError("Latest release hall-master.json differs from current hall-master.json")
    if latest_snapshot != current_snapshot:
        raise ValueError("Latest release published-submissions.json differs from current snapshot")
    return latest_dir.name


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("master", type=Path, nargs="?", default=Path("data/checkmate/hall-master.json"))
    parser.add_argument("--legacy-input", type=Path, default=DEFAULT_LEGACY_INPUT)
    parser.add_argument("--previous-legacy", type=Path, default=DEFAULT_PREVIOUS_LEGACY)
    parser.add_argument(
        "--published-snapshot",
        type=Path,
        default=Path("data/checkmate/published-submissions.json"),
    )
    parser.add_argument(
        "--releases-dir",
        type=Path,
        default=Path("data/checkmate/releases"),
    )
    args = parser.parse_args()
    dataset = load_json(args.master)
    records, anomalies = verify_dataset(dataset)
    converter = load_converter()
    conversion_warnings = []
    legacy_records = converter.convert_records(
        args.legacy_input,
        dataset["snapshotDate"],
        next(
            (
                record["publishedAt"]
                for record in records
                if record["source"] == "legacy_excel" and record["publishedAt"]
            ),
            dataset["generatedAt"],
        ),
        require_case_id=True,
        warnings=conversion_warnings,
    )
    if dataset.get("sourceName") != args.legacy_input.name:
        raise ValueError(
            f"Hall master sourceName must match legacy input: {dataset.get('sourceName')} != {args.legacy_input.name}"
        )
    compare_legacy(legacy_records, records)
    previous_dataset = load_json(args.previous_legacy)
    report_legacy_changes(previous_dataset, legacy_records)
    current_snapshot = load_json(args.published_snapshot)
    snapshot_records = verify_published_snapshot(current_snapshot)
    compare_published_snapshot(
        snapshot_records,
        legacy_records,
        records,
        valid_date(dataset["snapshotDate"], "snapshotDate"),
    )
    latest_version = verify_release_history(args.releases_dir, dataset, current_snapshot)
    sorted_records = sort_records(records)
    print(
        f"Verified published-submissions={len(snapshot_records)}; "
        f"legacy={len(legacy_records)}; hall={len(records)}; "
        f"latest-release={latest_version}; pending=0; rejected=0"
    )
    print("Top 3: " + ", ".join(f"{item['id']} ({item['waitingDays']})" for item in sorted_records[:3]))
    if anomalies:
        print("Warnings (preserved legacy anomalies):")
        for anomaly in anomalies:
            print(f"- {anomaly}")
    if conversion_warnings:
        print("Warnings (legacy Excel identity checks):")
        for warning in conversion_warnings:
            print(f"- {warning}")


if __name__ == "__main__":
    main()
