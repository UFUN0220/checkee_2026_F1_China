"""Verify the Master-driven Hall production chain or audit the legacy source."""

from __future__ import annotations

import argparse
import importlib.util
import json
import re
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_LEGACY_INPUT = Path("data/checkmate/hall_fame.xlsx")


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
LOCATIONS = {"北京", "上海", "广州", "沈阳", "武汉"}
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
    "status",
    "note",
    "compactNote",
    "detailNote",
    "publishedAt",
    "source",
    "visibility",
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


def verify_dataset(dataset, verify_waiting_days=True, require_nickname=True, enforce_locations=True):
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
        if enforce_locations and item["location"] not in LOCATIONS:
            raise ValueError(f"Record {index} has invalid location: {item['location']!r}")
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


def comparable_field(record, field):
    value = record.get(field)
    return None if field == "nickname" and value == "" else value


def audit_legacy(master_records, legacy_records):
    """Report legacy drift without treating canonical divergence as failure."""
    master_legacy = [record for record in master_records if record["source"] == "legacy_excel"]
    master_by_id = {record["id"]: record for record in master_legacy}
    legacy_by_id = {record["id"]: record for record in legacy_records}
    master_ids = set(master_by_id)
    legacy_ids = set(legacy_by_id)
    master_only = sorted(master_ids - legacy_ids)
    legacy_only = sorted(legacy_ids - master_ids)
    changed = []
    for case_id in sorted(master_ids & legacy_ids):
        for field in COMPARISON_FIELDS:
            master_value = comparable_field(master_by_id[case_id], field)
            legacy_value = comparable_field(legacy_by_id[case_id], field)
            if master_value != legacy_value:
                changed.append(
                    {
                        "case_id": case_id,
                        "field": field,
                        "master": master_value,
                        "legacy": legacy_value,
                    }
                )

    master_order = [record["id"] for record in master_legacy]
    legacy_order = [record["id"] for record in legacy_records]
    order_differences = [
        {
            "index": index + 1,
            "master": master_id,
            "legacy": legacy_id,
        }
        for index, (master_id, legacy_id) in enumerate(zip(master_order, legacy_order))
        if master_id != legacy_id
    ]
    order_differences.extend(
        {"index": index + 1, "master": master_id, "legacy": None}
        for index, master_id in enumerate(master_order[len(legacy_order):], start=len(legacy_order))
    )
    order_differences.extend(
        {"index": index + 1, "master": None, "legacy": legacy_id}
        for index, legacy_id in enumerate(legacy_order[len(master_order):], start=len(master_order))
    )

    report = {
        "masterLegacyCount": len(master_legacy),
        "legacyCount": len(legacy_records),
        "masterOnly": master_only,
        "legacyOnly": legacy_only,
        "changed": changed,
        "orderDifferences": order_differences,
        "contentParity": not (master_only or legacy_only or changed),
        "orderParity": not order_differences,
    }
    print(
        f"Legacy audit: master legacy={len(master_legacy)}; legacy input={len(legacy_records)}; "
        f"master-only={len(master_only)}; legacy-only={len(legacy_only)}; "
        f"changed fields={len(changed)}; order differences={len(order_differences)}"
    )
    if master_only:
        print("Master-only IDs: " + ", ".join(master_only))
    if legacy_only:
        print("Legacy-only IDs: " + ", ".join(legacy_only))
    if changed:
        print("Changed fields: " + ", ".join(f"{item['case_id']}.{item['field']}" for item in changed))
    return report


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
    hall_by_id = {record["id"]: record for record in hall_records}
    for snapshot_record in snapshot_records:
        if snapshot_record["id"] not in hall_by_id:
            raise ValueError(f"{release_dir.name} is missing snapshot record {snapshot_record['id']}")


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
            # Historical releases are immutable audit artifacts. The current
            # production dataset above is checked against its snapshotDate;
            # old releases may predate the current derivation rules.
            verify_waiting_days=False,
            require_nickname=False,
            enforce_locations=False,
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
    parser.add_argument(
        "--source",
        choices=("master", "legacy-audit"),
        default="master",
        help="Verify the Master-driven production chain (default) or audit Legacy without content-failure",
    )
    parser.add_argument("--legacy-input", type=Path, default=DEFAULT_LEGACY_INPUT)
    parser.add_argument("--report", type=Path, help="Optional JSON output path for legacy-audit results")
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

    if args.source == "master":
        current_snapshot = load_json(args.published_snapshot)
        snapshot_records = verify_published_snapshot(current_snapshot)
        latest_version = verify_release_history(args.releases_dir, dataset, current_snapshot)
        sorted_records = sort_records(records)
        print(
            f"Verified Master-driven Hall: published-snapshot-artifact={len(snapshot_records)}; "
            f"hall={len(records)}; latest-release={latest_version}"
        )
        print("Top 3: " + ", ".join(f"{item['id']} ({item['waitingDays']})" for item in sorted_records[:3]))
        if anomalies:
            print("Warnings:")
            for anomaly in anomalies:
                print(f"- {anomaly}")
        return

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
    audit_report = audit_legacy(records, legacy_records)
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(audit_report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Legacy audit report: {args.report}")
    if conversion_warnings:
        print("Warnings (legacy Excel identity checks):")
        for warning in conversion_warnings:
            print(f"- {warning}")


if __name__ == "__main__":
    main()
