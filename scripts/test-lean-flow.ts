/**
 * Testes da versão enxuta (sem banco): importador, deduplicação, WhatsApp e etapas.
 * Rode com: npm run test:lean
 */
import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { buildLeadImportKey } from "@/features/leads/import-key";
import { mapSuggestedService, parseProspectingWorkbook } from "@/features/leads/importer";
import { isLegacyStatus, stageLabel, stageOf } from "@/features/leads/stages";
import { getOtherContactLink, getWhatsAppTarget, isOfficialWhatsAppLink } from "@/features/leads/whatsapp-link";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed += 1;
  console.log(`✔ ${name}`);
}

function workbookFrom(rows: Record<string, unknown>[], sheet = "Leads", preface: unknown[][] = []) {
  const ws = XLSX.utils.aoa_to_sheet(preface);
  XLSX.utils.sheet_add_json(ws, rows, { origin: preface.length ? -1 : "A1" });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["capa"]]), "Resumo");
  XLSX.utils.book_append_sheet(wb, ws, sheet);
  // Ida e volta em bytes, como acontece no navegador.
  return XLSX.read(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }), { type: "buffer", cellDates: true });
}

// Planilha no formato antigo (cabeçalho "Negócio", modelo de 23 colunas).
const legacyRows = [
  { ID: 1, Prioridade: "Alta", "Negócio": "Padaria Aurora", Segmento: "Padaria", Bairro: "Centro", Telefone: "+55 41 3333-1111", Instagram: "https://www.instagram.com/padaria.aurora/", "Status do site": "Site não localizado", "Diferenciais observados": "Pedidos só por telefone", "Oportunidade da landing page": "Cardápio online", "Mensagem personalizada": "Olá, Padaria Aurora!", "Link para contato": "https://wa.me/5541999990001", "Status prospecção": "Não contatado" },
  { ID: 2, Prioridade: "Média", "Negócio": "Oficina Pistão", Segmento: "Oficina", Bairro: "Água Verde", Telefone: "(41) 3333-2222", "Mensagem personalizada": "Olá, Oficina!", "Link para contato": "https://www.instagram.com/oficinapistao", "Status prospecção": "Contato enviado" },
  { ID: 3, Prioridade: "Baixa", "Negócio": "Oficina Pistão", Segmento: "Oficina", Bairro: "Água Verde", Telefone: "(41) 3333-2222", "Status prospecção": "Contato enviado" },
];

test("lê planilha antiga com cabeçalho Negócio fora da primeira aba", () => {
  const result = parseProspectingWorkbook(workbookFrom(legacyRows, "100 Leads", [["Prospecção diária"], []]), "prospeccao_curitiba.xlsx");
  assert.equal(result.sheetName, "100 Leads");
  assert.equal(result.rows.length, 3);
  assert.equal(result.rows[0].company_name, "Padaria Aurora");
  assert.equal(result.rows[0].city, "Curitiba");
  assert.equal(result.rows[1].status, "Contato enviado");
});

test("telefone comum NÃO vira WhatsApp confirmado na importação", () => {
  const [aurora, pistao] = parseProspectingWorkbook(workbookFrom(legacyRows), "leads.xlsx").rows;
  assert.equal(aurora.phone, "+55 41 3333-1111");
  assert.equal(aurora.whatsapp, null);
  assert.equal(aurora.whatsapp_confirmed, false);
  assert.equal(pistao.whatsapp_confirmed, false);
  // Aurora tem link oficial wa.me → pode abrir WhatsApp; Pistão só tem telefone + Instagram → não.
  assert.ok(getWhatsAppTarget({ ...aurora, whatsapp: aurora.whatsapp ?? null, whatsapp_confirmed: false, contact_link: aurora.contact_link ?? null }));
  assert.equal(getWhatsAppTarget({ whatsapp: null, whatsapp_confirmed: false, contact_link: pistao.contact_link ?? null }), null);
});

test("chave de deduplicação igual à das versões anteriores", () => {
  const rows = parseProspectingWorkbook(workbookFrom(legacyRows), "leads.xlsx").rows;
  // Versão anterior: whatsapp = telefone, chave por Instagram > telefone > nome+bairro.
  const legacyKey = (row: (typeof legacyRows)[number]) => buildLeadImportKey({ company_name: row["Negócio"], instagram: row.Instagram, whatsapp: row.Telefone, phone: row.Telefone, neighborhood: row.Bairro });
  rows.forEach((row, index) => assert.equal(row.import_key, legacyKey(legacyRows[index])));
  assert.equal(rows[0].import_key, "instagram:padaria.aurora");
  assert.equal(rows[1].import_key, rows[2].import_key, "linhas repetidas geram a mesma chave");
});

test("CSV com cabeçalho Empresa e colunas novas", () => {
  const csv = [
    "Empresa,Cidade,UF,Telefone,WhatsApp,WhatsApp confirmado,Serviço sugerido,Sinal observado,Oportunidade comercial,Fonte pública,Etapa",
    "Transportes Rota Sul,Londrina,pr,(43) 3333-0000,(43) 99999-0000,Sim,Logística,Rastreamento manual,Sistema de rotas,https://exemplo.com/rota,Em conversa",
    "Loja Prisma,Maringá,PR,(44) 3333-0000,(44) 99999-1111,,Estoque,,,,",
    "Clínica Lume,Cascavel,PR,,,(45) 98888-2222,IA para WhatsApp,,,,Contatado",
  ].join("\n");
  const result = parseProspectingWorkbook(XLSX.read(csv, { type: "string" }), "leads.csv");
  const [rota, prisma, lume] = result.rows;
  assert.equal(rota.state, "PR");
  assert.equal(rota.whatsapp, "(43) 99999-0000");
  assert.equal(rota.whatsapp_confirmed, true);
  assert.equal(rota.suggested_service, "Logística");
  assert.equal(rota.differentiators, "Rastreamento manual");
  assert.equal(rota.landing_page_opportunity, "Sistema de rotas");
  assert.equal(rota.public_source, "https://exemplo.com/rota");
  assert.equal(rota.status, "Respondeu");
  assert.equal(prisma.whatsapp, "(44) 99999-1111");
  assert.equal(prisma.whatsapp_confirmed, false, "coluna WhatsApp sem confirmação não libera o botão");
  assert.equal(lume.whatsapp, "(45) 98888-2222");
  assert.equal(lume.whatsapp_confirmed, true, "número na coluna WhatsApp confirmado");
  assert.equal(lume.status, "Contato enviado");
});

test("serviço sugerido é normalizado", () => {
  assert.equal(mapSuggestedService("site"), "Site");
  assert.equal(mapSuggestedService("Assistente de IA no WhatsApp"), "IA para WhatsApp");
  assert.equal(mapSuggestedService("Logística"), "Logística");
  assert.equal(mapSuggestedService("controle de estoque"), "Estoque");
  assert.equal(mapSuggestedService("Consultoria"), "Outro");
  assert.equal(mapSuggestedService(""), null);
});

test("link do WhatsApp usa a mensagem atual e só existe com confirmação ou link oficial", () => {
  const base = { whatsapp: "(41) 99999-0001", whatsapp_confirmed: true, contact_link: null };
  const target = getWhatsAppTarget(base, "Olá! Mensagem editada & revisada")!;
  assert.equal(target.url, "https://wa.me/5541999990001?text=Ol%C3%A1!%20Mensagem%20editada%20%26%20revisada");
  assert.equal(getWhatsAppTarget({ ...base, whatsapp_confirmed: false }, "x"), null, "número não confirmado");
  assert.equal(getWhatsAppTarget({ whatsapp: null, whatsapp_confirmed: false, contact_link: "https://api.whatsapp.com/send?phone=5541988887777" }, "Oi")!.url, "https://wa.me/5541988887777?text=Oi");
  const shortLink = getWhatsAppTarget({ whatsapp: null, whatsapp_confirmed: false, contact_link: "wa.me/message/ABC123" }, "Oi")!;
  assert.equal(shortLink.messageIncluded, false);
  assert.ok(isOfficialWhatsAppLink("https://wa.me/5541999990001"));
  assert.ok(!isOfficialWhatsAppLink("https://wa.me.golpe.com/5541"));
  assert.ok(!isOfficialWhatsAppLink("https://instagram.com/empresa"));
  assert.equal(getOtherContactLink({ contact_link: "instagram.com/empresa" }), "https://instagram.com/empresa");
  assert.equal(getOtherContactLink({ contact_link: "https://wa.me/5541999990001" }), null);
});

test("etapas usam os status existentes e preservam os antigos", () => {
  assert.equal(stageLabel("Contato enviado"), "Contatado");
  assert.equal(stageLabel("Respondeu"), "Em conversa");
  assert.equal(stageOf("Reunião marcada"), "Respondeu");
  assert.equal(stageOf("Negociação"), "Proposta enviada");
  assert.ok(isLegacyStatus("Negociação"));
  assert.equal(stageLabel("Negociação"), "Proposta enviada · Negociação");
});

console.log(`\n${passed} testes passaram.`);
