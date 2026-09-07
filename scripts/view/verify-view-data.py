"""Validate the static JSON consumed by /view."""

from __future__ import annotations

import argparse
from collections import Counter
import json
import re
from datetime import date
from pathlib import Path


DEFAULT_SNAPSHOT = Path("json/checkmate/checkee-static-snapshot.json")
LOCATIONS = {"beijing", "shanghai", "guangzhou", "shenyang", "wuhan"}
STATUSES = {"pending", "clear", "reject"}
ISO_DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
CASE_FIELDS = {
    "publicId",
    "visaType",
    "visaEntry",
    "degree",
    "majorGroup",
    "location",
    "majorCategory",
    "status",
    "checkDate",
    "completeDate",
    "effectiveEndDate",
    "durationDays",
    "durationSource",
    "pendingAgeDays",
    "pendingAgeSource",
    "resolvedDurationDays",
    "sourceMonth",
    "snapshotDate",
    "dataOrigin",
}


def valid_date(value: object, label: str, allow_none: bool = False) -> None:
    if allow_none and value is None:
        return
    if not isinstance(value, str) or not ISO_DATE.fullmatch(value):
        raise ValueError(f"{label} must be YYYY-MM-DD")
    date.fromisoformat(value)


def validate(path: Path) -> dict[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError("snapshot must be an object")
    for key in ("manifest", "national", "locations", "monthlyF1Trends", "cases"):
        if key not in payload:
            raise ValueError(f"snapshot is missing {key}")
    manifest = payload["manifest"]
    cases = payload["cases"]
    if not isinstance(manifest, dict) or not isinstance(cases, list):
        raise ValueError("manifest and cases must have valid types")
    valid_date(manifest.get("snapshotDate"), "manifest.snapshotDate")
    if manifest.get("dataOrigin") != "CHECKEE_HTML":
        raise ValueError("manifest.dataOrigin must be CHECKEE_HTML")
    if manifest.get("recordCount") != len(cases) or manifest.get("includedCount") != len(cases):
        raise ValueError("manifest counts do not match cases")
    ids: set[str] = set()
    location_counts = {location: 0 for location in LOCATIONS}
    for index, case in enumerate(cases, start=1):
        if not isinstance(case, dict) or not CASE_FIELDS.issubset(case):
            raise ValueError(f"cases[{index}] is missing required fields")
        public_id = case["publicId"]
        if not isinstance(public_id, str) or not public_id:
            raise ValueError(f"cases[{index}].publicId is invalid")
        if public_id in ids:
            raise ValueError(f"duplicate case id: {public_id}")
        ids.add(public_id)
        if case["location"] not in LOCATIONS:
            raise ValueError(f"cases[{index}].location is invalid")
        if case["status"] not in STATUSES:
            raise ValueError(f"cases[{index}].status is invalid")
        valid_date(case["checkDate"], f"cases[{index}].checkDate")
        valid_date(case["completeDate"], f"cases[{index}].completeDate", allow_none=True)
        valid_date(case["effectiveEndDate"], f"cases[{index}].effectiveEndDate")
        if case["completeDate"] and case["completeDate"] < case["checkDate"]:
            raise ValueError(f"cases[{index}] completeDate precedes checkDate")
        if not isinstance(case["durationDays"], int) or case["durationDays"] < 0:
            raise ValueError(f"cases[{index}].durationDays is invalid")
        if case["status"] == "pending" and case["pendingAgeDays"] != case["durationDays"]:
            raise ValueError(f"cases[{index}] pendingAgeDays is inconsistent")
        location_counts[case["location"]] += 1
    if manifest.get("locationCounts"):
        for location, count in location_counts.items():
            if manifest["locationCounts"].get(location) != count:
                raise ValueError(f"manifest.locationCounts.{location} is inconsistent")
    national = payload["national"]
    if not isinstance(national, dict) or national.get("sampleCount") != len(cases):
        raise ValueError("national.sampleCount is inconsistent")
    locations = payload["locations"]
    if not isinstance(locations, dict):
        raise ValueError("locations must be an object")
    if sum(locations.get(location, {}).get("sampleCount", 0) for location in LOCATIONS) != len(cases):
        raise ValueError("location sample counts are inconsistent")
    trends = payload["monthlyF1Trends"]
    if not isinstance(trends, list):
        raise ValueError("monthlyF1Trends must be an array")
    trend_total = sum(item.get("totalCount", 0) for item in trends)
    if trend_total > len(cases):
        raise ValueError("monthlyF1Trends total exceeds case count")
    case_months = Counter(case.get("sourceMonth") for case in cases)
    trend_months = Counter({item.get("month"): item.get("totalCount", 0) for item in trends})
    monthly_mismatches = {
        month: {"cases": case_months[month], "trend": trend_months[month]}
        for month in sorted(set(case_months) | set(trend_months))
        if case_months[month] != trend_months[month]
    }
    return {
        "cases": len(cases),
        "locations": location_counts,
        "months": len(trends),
        "monthlyMismatches": monthly_mismatches,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path, nargs="?", default=DEFAULT_SNAPSHOT)
    args = parser.parse_args()
    summary = validate(args.snapshot)
    print(f"Verified /view snapshot: cases={summary['cases']}; months={summary['months']}; locations={summary['locations']}")
    if summary["monthlyMismatches"]:
        print(f"Warnings: monthlyF1Trends differs from case sourceMonth counts: {summary['monthlyMismatches']}")


if __name__ == "__main__":
    main()
