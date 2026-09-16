import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load("hall_fame_updated.xlsx"));
const sheet = workbook.worksheets.getItem("Sheet1");
console.log(JSON.stringify({ target: sheet.getRange("D5").values, id: sheet.getRange("S5").values, used: sheet.getUsedRange().address }));
const errors = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "saved workbook formula error scan",
});
console.log(errors.ndjson);
