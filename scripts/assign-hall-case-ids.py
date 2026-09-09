"""Assign monotonic IDs to blank Hall legacy case_id cells."""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
import re
import sys
import tempfile
from pathlib import Path
from zipfile import ZipFile


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = ROOT / "data/checkmate/hall_fame.xlsx"
DEFAULT_RELEASES_DIR = ROOT / "data/checkmate/releases"
LEGACY_ID = re.compile(r"^ufun-checkee-(\d+)$")


def load_converter():
    path = Path(__file__).with_name("convert-checkee-data.py")
    spec = importlib.util.spec_from_file_location("convert_checkee_data", path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load converter: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def is_valid_legacy_row(row, converter):
    if not converter.normalize(row.get("location")):
        return False
    interview_date = converter.normalize(row.get("interviewDate"))
    status = converter.normalize(row.get("status"))
    if not interview_date or not status:
        return False
    converter.date_value(interview_date)
    converter.canonical_status(status)
    return True


def scan_excel(path: Path, converter):
    rows = converter.read_xlsx(path)
    header_row, header_values = next(rows)
    columns = converter.header_columns(header_values)
    parsed_rows = []
    for excel_row, values in rows:
        row = {name: values.get(f"{column}{excel_row}") for name, column in columns.items()}
        parsed_rows.append((int(excel_row), row))

    case_ids = {}
    blank_rows = []
    for excel_row, row in parsed_rows:
        case_id = converter.normalize(row.get("caseId"))
        if case_id:
            case_ids.setdefault(case_id, []).append(excel_row)
        elif is_valid_legacy_row(row, converter):
            blank_rows.append(excel_row)
    return columns["caseId"], case_ids, blank_rows


def collect_namespace(input_path: Path, releases_dir: Path, case_ids):
    used_strings = set(case_ids)
    used_numbers = set()

    def add_id(value):
        if not isinstance(value, str):
            return
        used_strings.add(value)
        match = LEGACY_ID.fullmatch(value)
        if match:
            used_numbers.add(int(match.group(1)))

    for case_id in case_ids:
        add_id(case_id)

    current_master = ROOT / "data/checkmate/hall-master.json"
    json_paths = [current_master]
    if releases_dir.is_dir():
        json_paths.extend(releases_dir.glob("*/hall-master.json"))
    json_paths.append(ROOT / "data/checkmate/published-submissions.json")

    for path in json_paths:
        if not path.is_file():
            continue
        payload = load_json(path)
        records = payload.get("records", []) if isinstance(payload, dict) else []
        for record in records:
            if isinstance(record, dict):
                add_id(record.get("id"))

    return used_strings, used_numbers


def next_ids(blank_rows, used_strings, used_numbers):
    next_number = max(used_numbers, default=0) + 1
    assignments = []
    for excel_row in blank_rows:
        while True:
            candidate = f"ufun-checkee-{next_number:03d}"
            next_number += 1
            if candidate not in used_strings:
                break
        assignments.append((excel_row, candidate))
        used_strings.add(candidate)
        used_numbers.add(int(candidate.rsplit("-", 1)[1]))
    return assignments, f"ufun-checkee-{next_number:03d}"


def replace_case_id_cells(path: Path, column: str, assignments):
    if not assignments:
        return

    with ZipFile(path, "r") as source:
        members = {info.filename: (info, source.read(info.filename)) for info in source.infolist()}

    sheet_name = "xl/worksheets/sheet1.xml"
    sheet = members[sheet_name][1]
    for excel_row, case_id in assignments:
        row_pattern = re.compile(
            rb'(<row\b[^>]*\br="' + str(excel_row).encode() + rb'"[^>]*>)(.*?)(</row>)',
            re.DOTALL,
        )
        row_match = row_pattern.search(sheet)
        if not row_match:
            raise ValueError(f"Excel row {excel_row} was not found")

        row_body = row_match.group(2)
        cell_pattern = re.compile(
            rb'<c\b[^>]*\br="' + re.escape(column.encode()) + str(excel_row).encode() + rb'"[^>]*(?:/>|>.*?</c>)',
            re.DOTALL,
        )
        cell_match = cell_pattern.search(row_body)
        cell = f'<c r="{column}{excel_row}" t="str"><v>{case_id}</v></c>'.encode()
        if cell_match:
            row_body = row_body[: cell_match.start()] + cell + row_body[cell_match.end() :]
        else:
            row_body += cell
        replacement = row_match.group(1) + row_body + row_match.group(3)
        sheet = sheet[: row_match.start()] + replacement + sheet[row_match.end() :]

    members[sheet_name] = (members[sheet_name][0], sheet)
    temp_fd, temp_name = tempfile.mkstemp(prefix="hall_fame.", suffix=".xlsx.tmp", dir=path.parent)
    os.close(temp_fd)
    try:
        with ZipFile(temp_name, "w") as target:
            for info, content in members.values():
                target.writestr(info, content)
        os.replace(temp_name, path)
    finally:
        if os.path.exists(temp_name):
            os.unlink(temp_name)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--releases-dir", type=Path, default=DEFAULT_RELEASES_DIR)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    converter = load_converter()
    column, case_ids, blank_rows = scan_excel(args.input, converter)
    duplicates = {case_id: rows for case_id, rows in case_ids.items() if len(rows) > 1}
    if duplicates:
        print("Duplicate case_id values found; no IDs were assigned:", file=sys.stderr)
        for case_id, rows in duplicates.items():
            print(f"- {case_id}: Excel rows {', '.join(map(str, rows))}", file=sys.stderr)
        return 1

    used_strings, used_numbers = collect_namespace(args.input, args.releases_dir, case_ids)
    assignments, next_available = next_ids(blank_rows, used_strings, used_numbers)
    print(f"Found {len(blank_rows)} rows without case_id")
    if assignments:
        print("Plan:")
        for excel_row, case_id in assignments:
            print(f"- row {excel_row} -> {case_id}")
    else:
        print("Plan: no changes")
    print(f"Next available legacy ID: {next_available}")

    if not args.dry_run:
        replace_case_id_cells(args.input, column, assignments)
        if assignments:
            print(f"Assigned {len(assignments)} legacy IDs in {args.input}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
