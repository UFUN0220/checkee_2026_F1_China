import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("../data/checkmate/hall_fame.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const summary = await workbook.inspect({
  kind: "workbook,sheet,table",
  maxChars: 8000,
  tableMaxRows: 8,
  tableMaxCols: 14,
  tableMaxCellChars: 120,
});
console.log(summary.ndjson);
const sheets = await workbook.inspect({ kind: "sheet", include: "id,name" });
console.log(sheets.ndjson);
const firstSheet = workbook.worksheets.getItemAt(0);
const used = firstSheet.getUsedRange();
console.log(JSON.stringify({ sheet: firstSheet.name, usedRange: used.address, values: used.values.slice(0, 6) }));
const preview = await workbook.render({ sheetName: firstSheet.name, autoCrop: "all", scale: 1, format: "png" });
await fs.writeFile("inspect.png", new Uint8Array(await preview.arrayBuffer()));
