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

# Confirmed from Sheet1's header row:
# A 地点, B 学位, C 专业, E 面签日期, F 状态, G 结束日期,
# H 学校, J Note, K 等待天数. D and I are not used by the website.
SOURCE_COLUMNS = {
    "location": "A",
    "degree": "B",
    "major": "C",
    "interviewDate": "E",
    "status": "F",
    "endDate": "G",
    "school": "H",
    "note": "J",
    "waitingDays": "K",
}


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


def convert(input_path: Path, output_path: Path, snapshot_date: str):
    records = []
    for excel_row, values in read_xlsx(input_path):
        if excel_row == "1":
            continue
        row = {name: values.get(f"{column}{excel_row}") for name, column in SOURCE_COLUMNS.items()}
        location = normalize(row["location"])
        interview_date = date_value(row["interviewDate"])
        status = normalize(row["status"])
        if not location or not interview_date or not status:
            continue
        records.append(
            {
                "id": f"ufun-checkee-{int(excel_row):03d}",
                "location": location,
                "degree": normalize(row["degree"]),
                "major": normalize(row["major"]),
                "interviewDate": interview_date,
                "endDate": date_value(row["endDate"]),
                "status": status,
                "waitingDays": number_value(row["waitingDays"]),
                "school": normalize(row["school"]),
                "note": normalize(row["note"]),
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
