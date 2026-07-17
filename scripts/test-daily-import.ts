import fs from "node:fs";
import * as XLSX from "xlsx";
import { parseProspectingWorkbook } from "@/features/leads/importer";

const source = process.argv[2] || "/workspace/scratch/0b312202aeaf/upload/prospeccao_100_clientes_curitiba_personalizada(1).xlsx";
const workbook = XLSX.read(fs.readFileSync(source), { type: "buffer", cellDates: true });
const result = parseProspectingWorkbook(workbook, source.split(/[\\/]/).pop() || "prospeccao.xlsx");

const uniqueKeys = new Set(result.rows.map((row) => row.import_key));
const highPriority = result.rows.filter((row) => row.priority === "Alta").length;
const withPhone = result.rows.filter((row) => row.whatsapp).length;
const withContactLink = result.rows.filter((row) => row.contact_link).length;

const assertions: Array<[boolean, string]> = [
  [result.sheetName === "100 Leads", `aba esperada 100 Leads; recebida ${result.sheetName}`],
  [result.rows.length === 100, `100 linhas esperadas; recebidas ${result.rows.length}`],
  [uniqueKeys.size === 98, `98 leads únicos esperados; recebidos ${uniqueKeys.size}`],
  [highPriority === 61, `61 prioridades altas esperadas; recebidas ${highPriority}`],
  [withPhone === 83, `83 telefones esperados; recebidos ${withPhone}`],
  [withContactLink === 99, `99 links de contato esperados; recebidos ${withContactLink}`],
  [result.rows.every((row) => Boolean(row.message && row.prompt)), "todos os leads devem possuir mensagem e prompt"],
];

const failure = assertions.find(([valid]) => !valid);
if (failure) throw new Error(`Falha no teste de importação: ${failure[1]}`);

console.log(JSON.stringify({
  sheet: result.sheetName,
  totalRows: result.rows.length,
  uniqueLeads: uniqueKeys.size,
  duplicatesIgnored: result.rows.length - uniqueKeys.size,
  highPriority,
  withPhone,
  withContactLink,
}, null, 2));
