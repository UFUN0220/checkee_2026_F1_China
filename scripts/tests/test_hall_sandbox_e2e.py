"""Run the read-only Hall exporter and verifier against a sandbox SQL snapshot.

The fixture is supplied explicitly so this test never loads production website
environment variables or writes Hall JSON/Releases.
"""

from __future__ import annotations

import argparse
import gzip
import importlib.util
import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SNAPSHOT_DATE = "2026-10-16"
GENERATED_AT = "2026-10-16"
HISTORICAL_RELEASE = ROOT / "data/checkmate/releases/20261016-v001/hall-master.json"
MIGRATED_TOP3_CASES = ("submission-108", "submission-47", "submission-sandbox-20261016-002")


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load module: {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


exporter = load_module("hall_sandbox_master_exporter", ROOT / "scripts/export-hall-master-from-supabase.py")
verifier = load_module("hall_sandbox_verifier", ROOT / "scripts/verify-hall-data.py")


def build_sandbox_export(payload: dict) -> tuple[dict, dict, dict]:
    rows = payload["rows"]
    mappings = payload["identityMigrations"]
    real_submission_ids = set(payload["realPublishedSubmissionIds"])
    mappings_by_new_id = exporter.validate_migration_rows(rows, mappings)
    published_rows, visibility_counts = exporter.published_rows(rows)
    records = [
        exporter.map_record(row, SNAPSHOT_DATE, real_submission_ids, mappings)
        for row in published_rows
    ]
    exporter.validate_source_order_uniqueness(records)
    records.sort(key=lambda record: (exporter.SOURCE_PRIORITY[record["source"]], record["_sourceOrder"]))
    for record in records:
        record.pop("_sourceOrder")
        record.pop("_sourceRecordId")

    snapshot_records = exporter.real_submission_snapshot_records(records)
    dataset = {
        "schemaVersion": 1,
        "dataVersion": "20261016-v900",
        "generatedAt": GENERATED_AT,
        "sourceDescription": "Sandbox-only Hall compatibility test",
        "snapshotDate": SNAPSHOT_DATE,
        "recordCount": len(records),
        "masterRecordCount": len(rows),
        "publishedRecordCount": len(records),
        "records": records,
    }
    snapshot = {
        "schemaVersion": 1,
        "generatedAt": GENERATED_AT,
        "records": snapshot_records,
    }

    assert len(rows) == 255, f"expected 255 sandbox rows, got {len(rows)}"
    assert visibility_counts == {"published": 254, "rejected": 1}, visibility_counts
    assert len(records) == 254
    assert len(mappings) == 25
    assert len(mappings_by_new_id) == 25
    assert sum(record.get("submissionOrigin") == "legacy_migration" for record in records) == 25
    assert sum(record.get("submissionOrigin") == "legacy_case_submission" for record in records) == 147
    assert sum(record.get("submissionOrigin") == "master_submission" for record in records) == 1
    assert len(snapshot_records) == 148
    assert all(record.get("visibility") == "published" for record in records)
    assert all(record.get("submissionOrigin") != "legacy_migration" for record in snapshot_records)
    assert {str(record["id"]).removeprefix("submission-") for record in records
            if record.get("submissionOrigin") == "legacy_case_submission"} == real_submission_ids

    migrated_third = next(record for record in records if record["id"] == MIGRATED_TOP3_CASES[2])
    assert migrated_third["nickname"] == "碎碎念慈悲喜"

    verified_records, _ = verifier.verify_dataset(dataset)
    verified_snapshot = verifier.verify_published_snapshot(snapshot)
    assert len(verified_records) == 254
    assert len(verified_snapshot) == 148

    historical = json.loads(HISTORICAL_RELEASE.read_text(encoding="utf-8"))
    previous_top3 = verifier.sort_records(historical["records"])[:3]
    current_top3 = verifier.sort_records(records)[:3]
    old_to_new = {mapping["old_case_id"]: mapping["new_case_id"] for mapping in mappings}
    expected_top3_ids = [old_to_new.get(record["id"], record["id"]) for record in previous_top3]
    assert [record["id"] for record in current_top3] == expected_top3_ids
    assert [(record["nickname"], record["waitingDays"]) for record in current_top3] == [
        (record["nickname"], record["waitingDays"]) for record in previous_top3
    ]

    return dataset, snapshot, historical


def write_diff_fixture(path: Path, dataset: dict, historical: dict, mappings: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fixture = {
        "beforeRecords": historical["records"],
        "afterRecords": dataset["records"],
        "identityMigrations": [
            {"old_case_id": mapping["old_case_id"], "new_case_id": mapping["new_case_id"]}
            for mapping in mappings
        ],
    }
    path.write_text(json.dumps(fixture, ensure_ascii=False), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("fixture", type=Path, help="Temporary JSON snapshot of the sandbox tables")
    parser.add_argument("--diff-fixture-out", type=Path, required=True)
    args = parser.parse_args()
    if args.fixture.suffix == ".gz":
        with gzip.open(args.fixture, "rt", encoding="utf-8") as stream:
            payload = json.load(stream)
    else:
        payload = json.loads(args.fixture.read_text(encoding="utf-8"))
    dataset, snapshot, historical = build_sandbox_export(payload)
    write_diff_fixture(args.diff_fixture_out, dataset, historical, payload["identityMigrations"])
    print(
        "Sandbox exporter/verifier passed: "
        f"master={dataset['masterRecordCount']}, published={dataset['publishedRecordCount']}, "
        f"snapshot={len(snapshot['records'])}, migrations="
        f"{sum(record.get('submissionOrigin') == 'legacy_migration' for record in dataset['records'])}, "
        f"top3={','.join(record['id'] for record in verifier.sort_records(dataset['records'])[:3])}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
