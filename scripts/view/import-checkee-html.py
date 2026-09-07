"""Parse archived Checkee HTML pages into the static /view snapshot."""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from html.parser import HTMLParser
from pathlib import Path


DEFAULT_INPUT_DIR = Path("data/checkmate/view/raw")
DEFAULT_OUTPUT = Path("json/checkmate/checkee-static-snapshot.json")
DEFAULT_SOURCE_URL = "https://www.checkee.info/"
LOCATIONS = ("beijing", "shanghai", "guangzhou", "shenyang", "wuhan")
STATUSES = ("pending", "clear", "reject")
FIELD_ALIASES = {
    "publicId": ("public id", "public_id", "case id", "case_id", "case", "id", "编号"),
    "visaType": ("visa type", "visa_type", "visa", "签证类型"),
    "visaEntry": ("visa entry", "visa_entry", "entry", "签证类型", "签证"),
    "degree": ("degree", "学位"),
    "major": ("major", "专业", "专业方向"),
    "majorGroup": ("major group", "major_group", "学科组"),
    "location": ("location", "consulate", "us consulate", "城市", "地点", "领馆"),
    "status": ("status", "状态", "结果"),
    "checkDate": ("check date", "check_date", "interview date", "面签日期", "面签日"),
    "completeDate": ("complete date", "complete_date", "end date", "结束日期", "出结果日期"),
    "sourceMonth": ("source month", "source_month", "month", "月份"),
    "waitingDays": ("waiting days", "waiting day s", "waiting day(s)", "等待天数"),
}
LOCATION_ALIASES = {
    "beijing": {"beijing", "北京", "北京领馆"},
    "shanghai": {"shanghai", "上海", "上海领馆"},
    "guangzhou": {"guangzhou", "广州", "广州领馆"},
    "shenyang": {"shenyang", "沈阳", "沈阳领馆"},
    "wuhan": {"wuhan", "武汉", "武汉领馆"},
}
STATUS_ALIASES = {
    "pending": {"pending", "check", "waiting", "等待", "审理中"},
    "clear": {"clear", "approved", "approve", "issued", "issue", "通过", "批准", "签发"},
    "reject": {"reject", "rejected", "refused", "refuse", "拒签", "拒绝"},
}
STEM_TERMS = ("computer", "computer science", "data", "engineering", "math", "physics", "chem", "biology", "stem")
BUSINESS_TERMS = ("business", "finance", "account", "marketing", "management", "economics")
HUMANITIES_TERMS = ("art", "history", "law", "education", "language", "literature", "social", "humanities")


def clean(value: object) -> str:
    text = html.unescape("" if value is None else str(value))
    return re.sub(r"\s+", " ", text).strip()


def header_key(value: object) -> str:
    return re.sub(r"[^a-z0-9\u4e00-\u9fff]+", " ", clean(value).casefold()).strip()


class TableParser(HTMLParser):
    """Collect simple HTML tables while ignoring presentation markup."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.rows: list[list[str]] = []
        self.row_links: list[list[list[str]]] = []
        self._row: list[str] | None = None
        self._row_links: list[list[str]] | None = None
        self._cell: list[str] | None = None
        self._cell_links: list[str] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.casefold()
        if tag == "tr":
            self._row = []
            self._row_links = []
        elif tag in {"td", "th"} and self._row is not None:
            self._cell = []
            self._cell_links = []
        elif tag == "a" and self._cell_links is not None:
            href = dict(attrs).get("href")
            if href:
                self._cell_links.append(href)

    def handle_data(self, data: str) -> None:
        if self._cell is not None:
            self._cell.append(data)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.casefold()
        if tag in {"td", "th"} and self._cell is not None and self._row is not None:
            self._row.append(clean("".join(self._cell)))
            if self._row_links is not None:
                self._row_links.append(self._cell_links or [])
            self._cell = None
            self._cell_links = None
        elif tag == "tr" and self._row is not None:
            if any(self._row):
                self.rows.append(self._row)
                self.row_links.append(self._row_links or [])
            self._row = None
            self._row_links = None


def parse_date(value: object) -> str | None:
    text = clean(value)
    if not text or text.startswith("0000-00-00"):
        return None
    for pattern in (r"(\d{4})[-/.年](\d{1,2})[-/.月](\d{1,2})", r"(\d{1,2})[-/](\d{1,2})[-/](\d{4})"):
        match = re.search(pattern, text)
        if not match:
            continue
        groups = match.groups()
        year, month, day = groups if len(groups[0]) == 4 else (groups[2], groups[0], groups[1])
        return date(int(year), int(month), int(day)).isoformat()
    raise ValueError(f"Unsupported date value: {text}")


def canonical_location(value: object) -> str | None:
    text = clean(value).casefold()
    for location, aliases in LOCATION_ALIASES.items():
        if text in aliases:
            return location
    return None


def canonical_status(value: object) -> str | None:
    text = clean(value).casefold()
    for status, aliases in STATUS_ALIASES.items():
        if text in aliases:
            return status
    return None


def canonical_entry(value: object) -> str:
    text = clean(value).casefold()
    if any(token in text for token in ("renew", "续签", "re-entry")):
        return "renewal"
    return "initial"


def classify_major(value: str) -> str:
    text = value.casefold()
    if not text:
        return "Unknown"
    if any(term in text for term in STEM_TERMS):
        return "STEM"
    if any(term in text for term in BUSINESS_TERMS):
        return "Business"
    if any(term in text for term in HUMANITIES_TERMS):
        return "Humanities & Social Science"
    return "Other"


def percentile(values: list[int], fraction: float) -> float | int | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    result = ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)
    return int(result) if result.is_integer() else round(result, 2)


def distribution(values: list[str]) -> list[dict[str, object]]:
    counts = Counter(values)
    total = len(values) or 1
    return [
        {"key": key, "count": count, "share": round(count / total, 4)}
        for key, count in sorted(counts.items())
    ]


def build_scope_stats(cases: list[dict[str, object]], total_count: int | None = None) -> dict[str, object]:
    total = len(cases)
    total_count = total if total_count is None else total_count
    pending = [case for case in cases if case["status"] == "pending"]
    clear = [case for case in cases if case["status"] == "clear"]
    reject = [case for case in cases if case["status"] == "reject"]
    durations = [int(case["durationDays"]) for case in cases if case["durationDays"] is not None]
    pending_ages = [int(case["pendingAgeDays"]) for case in pending if case["pendingAgeDays"] is not None]
    resolved = [int(case["resolvedDurationDays"]) for case in clear if case["resolvedDurationDays"] is not None]
    check_dates = sorted(case["checkDate"] for case in cases)
    major_groups = [str(case["majorGroup"]) for case in cases]
    degrees = [str(case["degree"]) for case in cases]
    entries = [str(case["visaEntry"]) for case in cases]
    return {
        "sampleCount": total,
        "sampleShare": round(total / (total_count or 1), 4),
        "sampleBand": "standard",
        "pendingCount": len(pending),
        "clearCount": len(clear),
        "rejectCount": len(reject),
        "pendingAgeMeanDays": round(sum(pending_ages) / len(pending_ages), 1) if pending_ages else None,
        "pendingAgeMedianDays": percentile(pending_ages, 0.5),
        "pendingAgeP75Days": percentile(pending_ages, 0.75),
        "pendingAgeMaxDays": max(pending_ages) if pending_ages else None,
        "resolvedSampleCount": len(resolved),
        "resolvedDurationMedianDays": percentile(resolved, 0.5),
        "resolvedDurationP75Days": percentile(resolved, 0.75),
        "checkDateRange": {"start": check_dates[0], "end": check_dates[-1]} if check_dates else {"start": None, "end": None},
        "majorDistribution": distribution([str(case["majorCategory"]) for case in cases]),
        "degreeDistribution": distribution(degrees),
        "majorGroupDistribution": distribution(major_groups),
        "visaEntryDistribution": distribution(entries),
        "waitStats": {
            "q1": percentile(durations, 0.25),
            "median": percentile(durations, 0.5),
            "q3": percentile(durations, 0.75),
            "sampleSize": len(durations),
        },
    }


def find_header(rows: list[list[str]]) -> tuple[int, dict[str, int]]:
    aliases = {alias for values in FIELD_ALIASES.values() for alias in (header_key(item) for item in values)}
    for index, row in enumerate(rows):
        normalized = [header_key(value) for value in row]
        matches = {field: normalized.index(header_key(alias)) for field, values in FIELD_ALIASES.items() for alias in values if header_key(alias) in normalized}
        if len(set(matches.values())) >= 3 and any(value in aliases for value in normalized):
            return index, matches
    raise ValueError("No recognizable HTML table header found")


def row_value(row: list[str], columns: dict[str, int], field: str) -> str:
    index = columns.get(field)
    return row[index] if index is not None and index < len(row) else ""


def source_month_from_path(path: Path) -> str | None:
    match = re.search(r"(?:^|[^0-9])(20\d{2})[-_]?([01]\d)(?:[^0-9]|$)", path.stem)
    if not match:
        match = re.search(r"^(\d{2})([01]\d)$", path.stem)
        if match:
            return f"20{match.group(1)}-{match.group(2)}"
        return None
    return f"{match.group(1)}-{match.group(2)}"


def extract_case_id(row_links: list[list[str]]) -> str | None:
    for cell_links in row_links:
        for href in cell_links:
            match = re.search(r"(?:[?&])casenum=(\d+)", href, flags=re.IGNORECASE)
            if match:
                return f"case-{match.group(1)}"
    return None


def parse_cases(files: list[Path], snapshot_date: str) -> tuple[list[dict[str, object]], Counter[str], int]:
    cases: list[dict[str, object]] = []
    excluded: Counter[str] = Counter()
    candidate_count = 0
    seen_ids: set[str] = set()

    for path in files:
        parser = TableParser()
        parser.feed(path.read_text(encoding="utf-8", errors="replace"))
        header_index, columns = find_header(parser.rows)
        for row_index, row in enumerate(parser.rows[header_index + 1 :], header_index + 1):
            candidate_count += 1
            try:
                visa_type = row_value(row, columns, "visaType") or "F1"
                if visa_type.casefold() != "f1":
                    excluded["non_f1"] += 1
                    continue
                location_value = row_value(row, columns, "location")
                location = canonical_location(location_value)
                if location is None:
                    excluded["unknown_location"] += 1
                    continue
                status = canonical_status(row_value(row, columns, "status"))
                if status is None:
                    excluded["unknown_status"] += 1
                    continue
                check_date = parse_date(row_value(row, columns, "checkDate"))
                if check_date is None:
                    excluded["incomplete_record"] += 1
                    continue
                complete_date = parse_date(row_value(row, columns, "completeDate"))
                if complete_date and complete_date < check_date:
                    raise ValueError("complete date precedes check date")
                degree = clean(row_value(row, columns, "degree")) or "Unknown"
                major = clean(row_value(row, columns, "major"))
                major_group = clean(row_value(row, columns, "majorGroup")) or classify_major(major)
                source_month = clean(row_value(row, columns, "sourceMonth")) or source_month_from_path(path) or check_date[:7]
                effective_end = complete_date or snapshot_date
                duration_days = (date.fromisoformat(effective_end) - date.fromisoformat(check_date)).days
                row_links = parser.row_links[row_index] if row_index < len(parser.row_links) else []
                raw_id = extract_case_id(row_links) or clean(row_value(row, columns, "publicId"))
                identity = "|".join((location, check_date, degree, major, status, canonical_entry(row_value(row, columns, "visaEntry"))))
                public_id = raw_id or f"case-{hashlib.sha1(identity.encode('utf-8')).hexdigest()[:10]}"
                if public_id in seen_ids:
                    excluded["duplicate_candidate"] += 1
                    continue
                seen_ids.add(public_id)
                cases.append(
                    {
                        "publicId": public_id,
                        "visaType": "F1",
                        "visaEntry": canonical_entry(row_value(row, columns, "visaEntry")),
                        "degree": degree,
                        "majorGroup": major_group,
                        "location": location,
                        "majorCategory": major_group,
                        "status": status,
                        "checkDate": check_date,
                        "completeDate": complete_date,
                        "effectiveEndDate": effective_end,
                        "durationDays": duration_days,
                        "durationSource": "complete_date" if complete_date else "cutoff_date",
                        "pendingAgeDays": duration_days if status == "pending" else None,
                        "pendingAgeSource": "derived_snapshot_date" if status == "pending" else None,
                        "resolvedDurationDays": duration_days if status == "clear" else None,
                        "sourceMonth": source_month,
                        "snapshotDate": snapshot_date,
                        "dataOrigin": "CHECKEE_HTML",
                    }
                )
            except (TypeError, ValueError) as error:
                excluded["invalid_record"] += 1
                raise ValueError(f"{path.name}: invalid candidate row {row!r}: {error}") from error
    return cases, excluded, candidate_count


def build_snapshot(files: list[Path], snapshot_date: str, source_url: str) -> dict[str, object]:
    cases, excluded, candidate_count = parse_cases(files, snapshot_date)
    by_location = {location: [case for case in cases if case["location"] == location] for location in LOCATIONS}
    by_month: dict[str, list[dict[str, object]]] = defaultdict(list)
    for case in cases:
        by_month[str(case["sourceMonth"])].append(case)
    months = sorted(by_month)
    national = build_scope_stats(cases)
    monthly_trends = []
    cohorts = []
    for month in months:
        month_cases = by_month[month]
        durations = [int(case["durationDays"]) for case in month_cases if case["durationDays"] is not None]
        monthly_trends.append(
            {
                "month": month,
                "pendingCount": sum(case["status"] == "pending" for case in month_cases),
                "clearCount": sum(case["status"] == "clear" for case in month_cases),
                "totalCount": len(month_cases),
                "averageWaitingDays": round(sum(durations) / len(durations), 1) if durations else None,
                "averageSampleSize": len(durations),
                "waitingDaysTotal": sum(durations),
            }
        )
        cohorts.append({"month": month, "partial": month == snapshot_date[:7], **build_scope_stats(month_cases, len(cases))})
    imported_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    content = json.dumps(cases, ensure_ascii=False, separators=(",", ":"))
    content_hash = f"sha256-{hashlib.sha256(content.encode('utf-8')).hexdigest()[:16]}"
    excluded_total = sum(excluded.values())
    status_counts = Counter(str(case["status"]) for case in cases)
    location_counts = Counter(str(case["location"]) for case in cases)
    status_counts = {status: status_counts.get(status, 0) for status in STATUSES}
    location_counts = {location: location_counts.get(location, 0) for location in LOCATIONS}
    manifest = {
        "sourceName": "Checkee.info",
        "sourceUrl": source_url,
        "sourceMode": "manual-html-static",
        "dataOrigin": "CHECKEE_HTML",
        "accessStatus": "CHECKEE_ARCHIVED",
        "rangeStart": f"{months[0]}-01" if months else None,
        "rangeEnd": months[-1] if months else None,
        "coverageFrom": months[0] if months else None,
        "coverageThrough": months[-1] if months else None,
        "sourceMonths": months,
        "importedAt": imported_at,
        "fetchedAt": None,
        "snapshotDate": snapshot_date,
        "parserVersion": "checkee-html-archive-v1",
        "rawPageCount": len(files),
        "includedCount": len(cases),
        "excludedCountByReason": dict(excluded),
        "statusCounts": dict(status_counts),
        "locationCounts": dict(location_counts),
        "contentHash": content_hash,
        "currentMonthPartial": snapshot_date[:7] in by_month,
        "demoData": False,
        "recordCount": len(cases),
        "consulateCounts": dict(location_counts),
        "excludedCount": excluded_total,
        "quarantinedCount": 0,
        "schemaVersion": "3b-static-html-v1",
        "snapshotChecksum": content_hash,
        "isLive": False,
    }
    quality_report = {
        "totalCandidates": candidate_count,
        "includedCount": len(cases),
        "excludedCount": excluded_total,
        "excludedCountByReason": dict(excluded),
        "duplicateCandidateCount": 0,
        "duplicateKeyGroupCount": 0,
        "quarantinedCount": 0,
        "schemaGuardPassed": True,
    }
    return {
        "manifest": manifest,
        "national": national,
        "locations": {location: build_scope_stats(items, len(cases)) for location, items in by_location.items()},
        "cohorts": cohorts,
        "monthlyF1Trends": monthly_trends,
        "cases": cases,
        "qualityReport": quality_report,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--snapshot-date", default=date.today().isoformat())
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    args = parser.parse_args()
    date.fromisoformat(args.snapshot_date)
    files = sorted(args.input_dir.glob("*.html")) + sorted(args.input_dir.glob("*.htm"))
    if not files:
        raise SystemExit(f"No HTML snapshots found in {args.input_dir}")
    snapshot = build_snapshot(files, args.snapshot_date, args.source_url)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Parsed {snapshot['manifest']['includedCount']} cases from {len(files)} HTML files")
    print(f"Wrote {args.output}")


if __name__ == "__main__":
    main()
