"""Convert the checked-in Excel snapshot into the app's semantic static dataset.

This is a development-time utility only. Production builds and request handlers
read the generated JSON and never parse the XLSX file.
"""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from datetime import datetime, timedelta
from pathlib import Path
from xml.etree import ElementTree


SOURCE_NAME = "ufun_checkee_pure_processed.xlsx"

SOURCE_HEADERS = {
    "location": ("地点", "location"),
    "degree": ("学位", "degree"),
    "major": ("专业", "major"),
    "interviewDate": ("面签日期", "interview date", "interviewDate"),
    "status": ("状态", "status"),
    "endDate": ("结束日期", "end date", "endDate"),
    "school": ("学校", "school"),
    "note": ("Note", "备注", "note"),
    "waitingDays": ("等待天数", "waiting days", "waitingDays"),
}

COMPACT_NOTE_LIMIT = 28


def local_name(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def normalize(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"undefined", "nan", "n/a"}:
        return None
    return text


def read_xlsx(path: Path):
    with zipfile.ZipFile(path) as archive:
        shared_strings = []
        if "xl/sharedStrings.xml" in archive.namelist():
            root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
            for item in root:
                shared_strings.append("".join(node.text or "" for node in item.iter() if local_name(node.tag) == "t"))

        root = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        for row in root.iter():
            if local_name(row.tag) != "row":
                continue
            values = {}
            for cell in row:
                if local_name(cell.tag) != "c":
                    continue
                reference = cell.attrib.get("r", "")
                value = next((node.text for node in cell if local_name(node.tag) == "v"), None)
                inline = next((node.text or "" for node in cell.iter() if local_name(node.tag) == "t"), None)
                cell_type = cell.attrib.get("t")
                if cell_type == "s" and value is not None:
                    parsed = shared_strings[int(value)]
                elif cell_type in {"str", "inlineStr"}:
                    parsed = inline if inline is not None else value
                else:
                    parsed = value
                values[reference] = parsed
            yield row.attrib.get("r"), values


def date_value(value):
    value = normalize(value)
    if value is None:
        return None
    try:
        serial = float(value)
        return (datetime(1899, 12, 30) + timedelta(days=serial)).date().isoformat()
    except ValueError:
        match = re.match(r"^(\d{4}-\d{2}-\d{2})", value)
        if match:
            return match.group(1)
        raise ValueError(f"Unsupported date value: {value}")


def number_value(value):
    value = normalize(value)
    if value is None:
        return None
    number = float(value)
    return int(number) if number.is_integer() else number


def header_columns(header_values):
    columns = {}
    for cell_reference, value in header_values.items():
        normalized = normalize(value)
        if not normalized:
            continue
        column = re.sub(r"\d+$", "", cell_reference)
        columns.setdefault(normalized.casefold(), []).append(column)

    resolved = {}
    for field, aliases in SOURCE_HEADERS.items():
        for alias in aliases:
            matches = columns.get(alias.casefold())
            if matches:
                resolved[field] = matches[0]
                break
        if field not in resolved:
            raise ValueError(f"Missing Excel header for {field}: {aliases}")
    return resolved


def compact_note(value):
    detail = normalize(value)
    if not detail:
        return None
    if len(detail) <= COMPACT_NOTE_LIMIT:
        return detail

    first_sentence = re.split(r"(?<=[。！？!?；;\n])", detail, maxsplit=1)[0].strip()
    candidate = first_sentence or detail
    if len(candidate) <= COMPACT_NOTE_LIMIT:
        return candidate
    return candidate[: COMPACT_NOTE_LIMIT - 1].rstrip() + "…"


def convert(input_path: Path, output_path: Path, snapshot_date: str):
    records = []
    rows = read_xlsx(input_path)
    header_row, header_values = next(rows)
    columns = header_columns(header_values)

    for excel_row, values in rows:
        row = {name: values.get(f"{column}{excel_row}") for name, column in columns.items()}
        location = normalize(row["location"])
        interview_date = date_value(row["interviewDate"])
        status = normalize(row["status"])
        if not location or not interview_date or not status:
            continue
        detail_note = normalize(row["note"])
        waiting_days = number_value(row["waitingDays"])
        if waiting_days is None:
            raise ValueError(f"Missing waiting days at Excel row {excel_row}")
        records.append(
            {
                "id": f"ufun-checkee-{int(excel_row):03d}",
                "location": location,
                "degree": normalize(row["degree"]) or "",
                "major": normalize(row["major"]) or "",
                "school": normalize(row["school"]),
                "startDate": interview_date,
                "endDate": date_value(row["endDate"]),
                "compactNote": compact_note(detail_note),
                "detailNote": detail_note,
                "waitingDays": waiting_days,
            }
        )

    dataset = {
        "sourceName": SOURCE_NAME,
        "snapshotDate": snapshot_date,
        "recordCount": len(records),
        "records": records,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Converted {len(records)} records to {output_path}")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--snapshot-date", default="2026-09-04")
    args = parser.parse_args()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", args.snapshot_date):
        raise SystemExit("snapshot date must be YYYY-MM-DD")
    convert(args.input, args.output, args.snapshot_date)


if __name__ == "__main__":
    main()
