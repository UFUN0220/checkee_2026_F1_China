import fs from "node:fs/promises";
import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const input = await FileBlob.load("../data/checkmate/hall_fame.xlsx");
const workbook = await SpreadsheetFile.importXlsx(input);
const sheet = workbook.worksheets.getItem("Sheet1");
const target = sheet.getRange("D5");
const identity = sheet.getRange("A5:S5");
console.log(JSON.stringify({ before: target.values, row: identity.values }));

if (sheet.getRange("S5").values[0][0] !== "ufun-checkee-004") {
  throw new Error("Target row identity mismatch");
}
if (target.values[0][0] !== "CHBE") {
  throw new Error(`Unexpected target value: ${target.values[0][0]}`);
}

target.values = [["ChBE"]];
workbook.recalculate();

const after = await workbook.inspect({
  kind: "region",
  sheetId: "Sheet1",
  range: "A5:S5",
  maxChars: 3000,
});
console.log(after.ndjson);
const preview = await workbook.render({ sheetName: "Sheet1", range: "A1:S8", scale: 2, format: "png" });
await fs.writeFile("edited-preview.png", new Uint8Array(await preview.arrayBuffer()));
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save("hall_fame_updated.xlsx");
console.log("Wrote hall_fame_updated.xlsx");
