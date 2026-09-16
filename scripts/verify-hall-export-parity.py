"""Compare two static Hall exports by case_id and canonical record fields."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path


CANONICAL_FIELDS = (
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
SPECIAL_IDS = {
    "ufun-checkee-040",
    "submission-18",
    "submission-31",
    "submission-57",
    "submission-70",
    "submission-74",
    "submission-75",
    "submission-82",
    *(f"submission-{number}" for number in range(87, 93)),
}
METADATA_FIELDS = ("schemaVersion", "dataVersion", "sourceDescription", "sourceName", "snapshotDate", "recordCount")


def load_dataset(path: Path) -> dict:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict) or not isinstance(payload.get("records"), list):
        raise ValueError(f"{path} must contain a Hall dataset object with records")
    if any(not isinstance(record, dict) for record in payload["records"]):
        raise ValueError(f"{path} contains a non-object record")
    return payload


def index_records(dataset: dict, label: str) -> tuple[dict[str, dict], list[str]]:
    indexed: dict[str, dict] = {}
    order: list[str] = []
    for index, record in enumerate(dataset["records"], start=1):
        case_id = record.get("id")
        if not isinstance(case_id, str) or not case_id:
            raise ValueError(f"{label} record {index} has no non-empty id")
        if case_id in indexed:
            raise ValueError(f"{label} has duplicate id {case_id}")
        missing = set(CANONICAL_FIELDS) - record.keys()
        extra = record.keys() - set(CANONICAL_FIELDS)
        if missing or extra:
            raise ValueError(f"{label} record {case_id} schema mismatch: missing={sorted(missing)}, extra={sorted(extra)}")
        indexed[case_id] = record
        order.append(case_id)
    if dataset.get("recordCount") != len(indexed):
        raise ValueError(f"{label} recordCount metadata does not match the number of records")
    return indexed, order


def rank_key(record: dict) -> tuple[int, str]:
    waiting_days = record.get("waitingDays")
    if not isinstance(waiting_days, (int, float)):
        waiting_days = -1
    start_date = record.get("startDate")
    return (-int(waiting_days), str(start_date or ""))


def ranked_ids(indexed: dict[str, dict]) -> list[str]:
    # Matches components/checkmate/checkmate-experience.tsx: waitingDays DESC,
    # then startDate ASC; Python's sort remains stable for exact ties.
    return sorted(indexed, key=lambda case_id: rank_key(indexed[case_id]))


def rank_tie_order_differences(
    left_ids: list[str],
    right_ids: list[str],
    left_records: dict[str, dict],
    right_records: dict[str, dict],
) -> list[dict]:
    left_groups: dict[tuple[int, str], list[str]] = {}
    right_groups: dict[tuple[int, str], list[str]] = {}
    for case_id in left_ids:
        left_groups.setdefault(rank_key(left_records[case_id]), []).append(case_id)
    for case_id in right_ids:
        right_groups.setdefault(rank_key(right_records[case_id]), []).append(case_id)
    differences = []
    for key, left_group in left_groups.items():
        right_group = right_groups.get(key, [])
        if len(left_group) > 1 and left_group != right_group:
            differences.append({"rank": {"waitingDays": -key[0], "startDate": key[1]}, "production": left_group, "master": right_group})
    return differences


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--production", type=Path, required=True)
    parser.add_argument("--master", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()

    try:
        production = load_dataset(args.production)
        master = load_dataset(args.master)
        production_rows, production_order = index_records(production, "production")
        master_rows, master_order = index_records(master, "master")

        snapshot_dates_match = production.get("snapshotDate") == master.get("snapshotDate")
        if not snapshot_dates_match:
            raise ValueError("Production and master snapshotDate values differ")
        snapshot_date = production.get("snapshotDate")
        if not isinstance(snapshot_date, str):
            raise ValueError("Both datasets must declare snapshotDate")
        date.fromisoformat(snapshot_date)

        production_ids = set(production_rows)
        master_ids = set(master_rows)
        added_ids = sorted(master_ids - production_ids)
        removed_ids = sorted(production_ids - master_ids)
        changed = []
        for case_id in sorted(production_ids & master_ids):
            for field in CANONICAL_FIELDS:
                if production_rows[case_id][field] != master_rows[case_id][field]:
                    changed.append({
                        "case_id": case_id,
                        "field": field,
                        "production": production_rows[case_id][field],
                        "master": master_rows[case_id][field],
                    })

        changed_case_ids = sorted({item["case_id"] for item in changed})
        metadata_differences = [
            {"field": field, "production": production.get(field), "master": master.get(field)}
            for field in METADATA_FIELDS
            if production.get(field) != master.get(field)
        ]
        unchanged_count = len(production_ids & master_ids) - len(changed_case_ids)
        ranked_production = ranked_ids(production_rows)
        ranked_master = ranked_ids(master_rows)
        rank_keys_match = [rank_key(production_rows[key]) for key in ranked_production] == [rank_key(master_rows[key]) for key in ranked_master] if production_ids == master_ids else False
        tie_order_differences = rank_tie_order_differences(
            ranked_production,
            ranked_master,
            production_rows,
            master_rows,
        ) if production_ids == master_ids else []
        order_differences = [
            {"index": index + 1, "production": production_id, "master": master_id}
            for index, (production_id, master_id) in enumerate(zip(production_order, master_order))
            if production_id != master_id
        ]
        order_differences.extend(
            {"index": index + 1, "production": production_id, "master": None}
            for index, production_id in enumerate(production_order[len(master_order):], start=len(master_order))
        )
        order_differences.extend(
            {"index": index + 1, "production": None, "master": master_id}
            for index, master_id in enumerate(master_order[len(production_order):], start=len(production_order))
        )

        source_counts = {
            label: dict(sorted(Counter(row.get("source") for row in indexed.values()).items()))
            for label, indexed in (("production", production_rows), ("master", master_rows))
        }
        special_records = []
        for case_id in sorted(SPECIAL_IDS & (production_ids | master_ids)):
            differing_fields = [
                field for field in CANONICAL_FIELDS
                if case_id in production_rows and case_id in master_rows
                and production_rows[case_id][field] != master_rows[case_id][field]
            ]
            special_records.append({"case_id": case_id, "present_in_production": case_id in production_rows, "present_in_master": case_id in master_rows, "differing_fields": differing_fields})

        report = {
            "snapshotDate": snapshot_date,
            "canonicalParity": not (added_ids or removed_ids or changed),
            "completeParity": not (added_ids or removed_ids or changed or metadata_differences or order_differences),
            "productionCount": len(production_rows),
            "masterCount": len(master_rows),
            "sourceCounts": source_counts,
            "added": added_ids,
            "removed": removed_ids,
            "changedCount": len(changed_case_ids),
            "changed": changed,
            "unchanged": unchanged_count,
            "metadataDifferences": metadata_differences,
            "sorting": {
                "productionExportRecordOrder": "legacy Excel input order followed by published snapshot order; exporter does not sort records",
                "hallRankingComparator": "waitingDays DESC, then startDate ASC (stable for exact ties)",
                "rankKeysMatch": rank_keys_match,
                "rankedIdOrderMatch": ranked_production == ranked_master,
                "tieOrderDifferences": tie_order_differences,
                "productionRawOrderMatchMasterRawOrder": production_order == master_order,
                "orderDifferences": order_differences,
            },
            "specialCaseIds": special_records,
            "ignoredMetadata": ["generatedAt", "candidate file paths", "temporary compare timestamp"],
        }
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        print(f"Snapshot date: {snapshot_date}")
        print(f"Production count: {len(production_rows)}")
        print(f"Master count: {len(master_rows)}")
        print(f"Added: {len(added_ids)}")
        print(f"Removed: {len(removed_ids)}")
        print(f"Changed: {len(changed_case_ids)}")
        print(f"Unchanged: {unchanged_count}")
        print(f"Metadata differences: {len(metadata_differences)}")
        print(f"Hall rank keys match: {rank_keys_match}")
        print(f"Stable tie-order differences: {len(tie_order_differences)}")
        print(f"Order differences: {len(order_differences)}")
        print(f"Complete parity: {not (added_ids or removed_ids or changed or metadata_differences or order_differences)}")
        print(f"Diff report: {args.report}")
        return 1 if added_ids or removed_ids or changed or metadata_differences or order_differences else 0
    except (OSError, ValueError, json.JSONDecodeError) as error:
        print(f"Parity verification failed: {error}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
