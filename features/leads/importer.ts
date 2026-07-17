import * as XLSX from "xlsx";
import type { Lead, LeadStatus, Priority } from "@/types";
import { buildLeadImportKey, normalizeSpreadsheetKey } from "./import-key";

export type ImportedLeadRow = Partial<Lead> & {
  company_name: string;
  import_key: string;
  status: LeadStatus;
  priority: Priority;
};

type ImportResult = {
  sheetName: string;
  rows: ImportedLeadRow[];
  ignoredRows: number;
};

const aliases: Record<string, string[]> = {
  source_external_id: ["id", "codigo", "código"],
  company_name: ["negócio", "negocio", "empresa", "nome da empresa", "company", "company name", "razão social", "nome"],
  contact_name: ["contato", "nome do contato", "contact", "contact name", "responsável"],
  phone: ["telefone", "phone", "fone", "whatsapp", "wpp", "celular"],
  email: ["email", "e-mail"],
  segment: ["segmento", "segment", "categoria"],
  city: ["cidade", "city"],
  state: ["estado", "uf", "state"],
  neighborhood: ["bairro", "neighborhood"],
  instagram: ["instagram", "insta"],
  website: ["site", "website", "url do site"],
  website_status: ["status do site", "situação do site", "situacao do site"],
  source: ["origem", "source", "fonte"],
  priority: ["prioridade", "priority"],
  status: ["status", "etapa"],
  message: ["mensagem personalizada", "mensagem", "message"],
  prompt: ["prompt para gerar site", "prompt"],
  differentiators: ["diferenciais observados", "diferenciais"],
  landing_page_opportunity: ["oportunidade da landing page", "oportunidade"],
  contact_link: ["link para contato", "link de contato"],
  best_contact_day: ["melhor dia", "dia para contato"],
  best_contact_time: ["melhor horário", "melhor horario", "horário", "horario"],
  contact_time_reason: ["motivo do horário", "motivo do horario"],
  public_source: ["fonte pública", "fonte publica"],
  image_source: ["fonte de imagens", "imagens"],
  prospecting_status: ["status prospecção", "status prospeccao"],
  contacted_at: ["data do contato", "data contato"],
  response: ["resposta", "retorno"],
  offered_value: ["valor oferecido", "valor", "preço", "preco"],
  observations: ["observações", "observacoes", "observação", "observacao"],
};

function getRaw(row: Record<string, unknown>, field: keyof typeof aliases) {
  const normalized = Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeSpreadsheetKey(key), value]),
  );
  const key = aliases[field].map(normalizeSpreadsheetKey).find((candidate) => normalized[candidate] !== undefined);
  return key ? normalized[key] : undefined;
}

function getText(row: Record<string, unknown>, field: keyof typeof aliases) {
  const value = getRaw(row, field);
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseCurrency(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "").trim();
  if (!text) return null;
  const normalized = text.replace(/[^0-9,.-]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseDate(value: unknown) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H, parsed.M, parsed.S)).toISOString();
  }
  const text = String(value).trim();
  const brazilian = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (brazilian) {
    return new Date(
      Number(brazilian[3]),
      Number(brazilian[2]) - 1,
      Number(brazilian[1]),
      Number(brazilian[4] || 12),
      Number(brazilian[5] || 0),
    ).toISOString();
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function mapPriority(value: string): Priority {
  const normalized = normalizeSpreadsheetKey(value);
  if (normalized === "alta") return "Alta";
  if (normalized === "baixa") return "Baixa";
  return "Média";
}

function mapProspectingStatus(value: string): LeadStatus {
  const normalized = normalizeSpreadsheetKey(value);
  if (!normalized || normalized.includes("naocontatado")) return "Novo";
  if (normalized.includes("perdido") || normalized.includes("seminteresse") || normalized.includes("recusou")) return "Perdido";
  if (normalized.includes("fechado") || normalized.includes("aprovado")) return "Fechado";
  if (normalized.includes("negociacao")) return "Negociação";
  if (normalized.includes("proposta")) return "Proposta enviada";
  if (normalized.includes("reuniao")) return "Reunião marcada";
  if (normalized.includes("respondeu") || normalized.includes("resposta")) return "Respondeu";
  if (normalized.includes("contato") || normalized.includes("mensagemenviada")) return "Contato enviado";
  return "Novo";
}

function inferLocation(fileName: string) {
  const normalized = normalizeSpreadsheetKey(fileName);
  if (normalized.includes("curitiba")) return { city: "Curitiba", state: "PR" };
  return { city: "", state: "" };
}

function mapRow(row: Record<string, unknown>, fileName: string): ImportedLeadRow | null {
  const company_name = getText(row, "company_name");
  if (!company_name) return null;
  const inferred = inferLocation(fileName);
  const phone = getText(row, "phone");
  const instagram = getText(row, "instagram");
  const websiteStatus = getText(row, "website_status");
  const prospectingStatus = getText(row, "prospecting_status") || getText(row, "status") || "Não contatado";
  const neighborhood = getText(row, "neighborhood");
  const city = getText(row, "city") || inferred.city;
  const state = (getText(row, "state") || inferred.state).toUpperCase();

  const mapped: ImportedLeadRow = {
    source_external_id: getText(row, "source_external_id") || null,
    company_name,
    contact_name: getText(row, "contact_name") || null,
    phone: phone || null,
    whatsapp: phone || null,
    email: getText(row, "email") || null,
    segment: getText(row, "segment") || null,
    city: city || null,
    state: state || null,
    neighborhood: neighborhood || null,
    instagram: instagram || null,
    website: getText(row, "website") || null,
    website_status: websiteStatus || null,
    has_website: Boolean(getText(row, "website")) && !normalizeSpreadsheetKey(websiteStatus).includes("naolocalizado"),
    source: `Planilha diária: ${fileName}`,
    priority: mapPriority(getText(row, "priority")),
    status: mapProspectingStatus(prospectingStatus),
    message: getText(row, "message") || null,
    prompt: getText(row, "prompt") || null,
    differentiators: getText(row, "differentiators") || null,
    landing_page_opportunity: getText(row, "landing_page_opportunity") || null,
    contact_link: getText(row, "contact_link") || null,
    best_contact_day: getText(row, "best_contact_day") || null,
    best_contact_time: getText(row, "best_contact_time") || null,
    contact_time_reason: getText(row, "contact_time_reason") || null,
    public_source: getText(row, "public_source") || null,
    image_source: getText(row, "image_source") || null,
    prospecting_status: prospectingStatus,
    contacted_at: parseDate(getRaw(row, "contacted_at")),
    response: getText(row, "response") || null,
    offered_value: parseCurrency(getRaw(row, "offered_value")),
    observations: getText(row, "observations") || null,
    import_key: "",
  };
  mapped.import_key = buildLeadImportKey(mapped);
  return mapped;
}

function locateLeadSheet(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: true,
      blankrows: false,
    });
    const headerRowIndex = matrix.slice(0, 15).findIndex((row) => {
      const headers = new Set(row.map((value) => normalizeSpreadsheetKey(String(value ?? ""))));
      return headers.has("negocio") || headers.has("empresa") || headers.has("nomedaempresa");
    });
    if (headerRowIndex >= 0) return { sheetName, headerRowIndex };
  }
  return null;
}

export function parseProspectingWorkbook(workbook: XLSX.WorkBook, fileName: string): ImportResult {
  const located = locateLeadSheet(workbook);
  if (!located) throw new Error("Não encontrei uma aba com as colunas Negócio ou Empresa");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[located.sheetName], {
    range: located.headerRowIndex,
    defval: "",
    raw: true,
  });
  const mapped = raw.map((row) => mapRow(row, fileName));
  return {
    sheetName: located.sheetName,
    rows: mapped.filter(Boolean) as ImportedLeadRow[],
    ignoredRows: mapped.filter((row) => !row).length,
  };
}
