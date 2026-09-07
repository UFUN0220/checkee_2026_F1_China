from pathlib import Path
import zipfile
import xml.etree.ElementTree as ElementTree


source = Path(
    "D:/codex/codex-home/visualizations/2026/09/06/01a077b4-6bfb-7b11-9ecb-5ee6a6db9937/checkee-case-id/hall_fame-with-case-id-openpyxl.xlsx"
)
output = Path(
    "D:/codex/codex-home/visualizations/2026/09/06/01a077b4-6bfb-7b11-9ecb-5ee6a6db9937/checkee-case-id/hall_fame-stable-case-id-cached.xlsx"
)
namespace = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
ElementTree.register_namespace("", namespace)
values = {"K50": "78", "K74": "59", "K94": "36"}

with zipfile.ZipFile(source, "r") as source_zip, zipfile.ZipFile(
    output, "w", zipfile.ZIP_DEFLATED
) as output_zip:
    for info in source_zip.infolist():
        data = source_zip.read(info.filename)
        if info.filename == "xl/worksheets/sheet1.xml":
            root = ElementTree.fromstring(data)
            for cell in root.iter(f"{{{namespace}}}c"):
                reference = cell.attrib.get("r")
                if reference not in values:
                    continue
                value = cell.find(f"{{{namespace}}}v")
                if value is None:
                    value = ElementTree.SubElement(cell, f"{{{namespace}}}v")
                value.text = values[reference]
            data = ElementTree.tostring(root, encoding="utf-8", xml_declaration=True)
        output_zip.writestr(info, data)

print(output)
