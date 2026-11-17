/**
 * Testes das regras do assistente de IA (sem rede). Rode com: npm run test:assistant
 */
import assert from "node:assert/strict";
import { buildSystemPrompt, buildTurns, insideWhatsAppWindow, parseDecision, phoneVariants } from "@/features/assistant/decision";

let passed = 0;
function test(name: string, fn: () => void) { fn(); passed += 1; console.log(`✔ ${name}`); }
const now = new Date("2026-11-17T15:00:00-03:00");

test("prompt usa a configuração e os dados do lead, e proíbe inventar preço", () => {
  const prompt = buildSystemPrompt({ signature: "Lynk", offer: "Sites e IA para WhatsApp", pricing: "Site a partir de R$ 900" }, { company_name: "Clínica Sorriso", suggested_service: "IA para WhatsApp", city: "Curitiba", state: "PR" }, now);
  assert.match(prompt, /Lynk/);
  assert.match(prompt, /Sites e IA para WhatsApp/);
  assert.match(prompt, /R\$ 900/);
  assert.match(prompt, /Clínica Sorriso/);
  assert.match(prompt, /Curitiba\/PR/);
  assert.match(prompt, /Nunca invente preços/);
  assert.match(prompt, /assistente virtual/);
});

test("sem preço configurado, a IA não fala valores", () => {
  assert.match(buildSystemPrompt({}, { company_name: "X" }, now), /não falar valores/);
});

test("conversa: primeira mensagem nossa vira contexto; mensagens seguidas do mesmo lado são unidas", () => {
  const turns = buildTurns([
    { direction: "out", author: "human", message: "Olá! Vi a Clínica no Google.", created_at: "2026-11-17T10:00:00Z" },
    { direction: "in", author: "lead", message: "Oi", created_at: "2026-11-17T11:00:00Z" },
    { direction: "in", author: "lead", message: "quanto custa?", created_at: "2026-11-17T11:00:30Z" },
  ]);
  assert.equal(turns.length, 1);
  assert.equal(turns[0].role, "user");
  assert.match(turns[0].text, /Mensagem que enviamos antes: "Olá! Vi a Clínica no Google\."/);
  assert.match(turns[0].text, /Oi\nquanto custa\?/);
});

test("decisão válida passa; formatação markdown é limpa", () => {
  const decision = parseDecision(JSON.stringify({ reply: "Oi! **Claro**, posso ajudar.", action: "none" }), now);
  assert.equal(decision.reply, "Oi! Claro, posso ajudar.");
  assert.equal(decision.action, "none");
});

test("JSON inválido ou incompleto vira 'chamar você' e nunca envia texto quebrado", () => {
  assert.deepEqual(parseDecision("não é json", now).action, "handoff");
  assert.equal(parseDecision("não é json", now).reply, "");
  assert.equal(parseDecision(JSON.stringify({ action: "voar" }), now).action, "handoff");
});

test("retorno sem data válida vira 'chamar você'; com data válida é mantido", () => {
  assert.equal(parseDecision(JSON.stringify({ reply: "Combinado!", action: "schedule_follow_up", follow_up_at: "amanhã" }), now).action, "handoff");
  assert.equal(parseDecision(JSON.stringify({ reply: "Combinado!", action: "schedule_follow_up", follow_up_at: "2026-11-18T10:00:00-03:00" }), now).action, "schedule_follow_up");
  assert.equal(parseDecision(JSON.stringify({ reply: "x", action: "schedule_follow_up", follow_up_at: "2019-01-01T10:00:00Z" }), now).action, "handoff", "data no passado");
});

test("mudar etapa sem etapa vira só responder", () => {
  assert.equal(parseDecision(JSON.stringify({ reply: "ok", action: "move_stage" }), now).action, "none");
});

test("número: com e sem o 9 do celular, com e sem 55", () => {
  assert.deepEqual(phoneVariants("5541997770101").sort(), ["554197770101", "5541997770101"].sort());
  assert.ok(phoneVariants("554197770101").includes("5541997770101"), "WhatsApp às vezes manda sem o 9");
  assert.ok(phoneVariants("(41) 99777-0101").includes("5541997770101"));
  assert.deepEqual(phoneVariants("554133332222"), ["554133332222"], "fixo não ganha 9");
});

test("janela de 24 h do WhatsApp", () => {
  assert.equal(insideWhatsAppWindow(null, now), false);
  assert.equal(insideWhatsAppWindow(new Date(now.getTime() - 3_600_000).toISOString(), now), true);
  assert.equal(insideWhatsAppWindow(new Date(now.getTime() - 25 * 3_600_000).toISOString(), now), false);
});

console.log(`\n${passed} testes passaram.`);
