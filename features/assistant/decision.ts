/**
 * Regras puras do assistente (sem rede): monta o prompt, a conversa e valida a decisão da IA.
 */
import { z } from "zod";

export const ASSISTANT_ACTIONS = ["none", "move_stage", "schedule_follow_up", "handoff", "mark_lost"] as const;
export const ASSISTANT_STAGES = ["Respondeu", "Proposta enviada", "Fechado", "Perdido"] as const;

/** O que a IA devolve a cada mensagem do lead. */
export const decisionSchema = z.object({
  reply: z.string().max(1200).default(""),
  action: z.enum(ASSISTANT_ACTIONS).default("none"),
  stage: z.enum(ASSISTANT_STAGES).nullish(),
  follow_up_at: z.string().nullish(),
  handoff_reason: z.string().max(300).nullish(),
});
export type AssistantDecision = z.infer<typeof decisionSchema>;

/** Esquema no formato do Gemini (responseSchema). */
export const GEMINI_DECISION_SCHEMA = {
  type: "OBJECT",
  properties: {
    reply: { type: "STRING", description: "Mensagem a enviar ao lead pelo WhatsApp. Vazio quando não houver nada a enviar." },
    action: { type: "STRING", enum: [...ASSISTANT_ACTIONS] },
    stage: { type: "STRING", enum: [...ASSISTANT_STAGES], nullable: true },
    follow_up_at: { type: "STRING", nullable: true, description: "Data e hora do retorno em ISO 8601 com fuso -03:00" },
    handoff_reason: { type: "STRING", nullable: true, description: "Motivo curto para chamar o vendedor" },
  },
  required: ["reply", "action"],
} as const;

export type AssistantSettings = {
  business_description?: string | null;
  offer?: string | null;
  pricing?: string | null;
  tone?: string | null;
  handoff_rules?: string | null;
  signature?: string | null;
};

export type AssistantLead = {
  company_name: string;
  segment?: string | null;
  city?: string | null;
  state?: string | null;
  suggested_service?: string | null;
  suggested_service_detail?: string | null;
  differentiators?: string | null;
  landing_page_opportunity?: string | null;
  status?: string | null;
};

export type ConversationMessage = { direction: "in" | "out"; author?: string | null; message: string; created_at: string };

const blank = (value?: string | null, fallback = "não informado") => (value && value.trim() ? value.trim() : fallback);

/** Instruções fixas do assistente (sem horário, para a parte estável do prompt não mudar a cada chamada). */
export function buildSystemPrompt(settings: AssistantSettings, lead: AssistantLead, now: Date) {
  const nowText = now.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "full", timeStyle: "short" });
  return [
    `Você é o assistente comercial de WhatsApp de ${blank(settings.signature, "uma empresa de soluções digitais")}. Responde leads que já receberam uma primeira mensagem de prospecção e responderam.`,
    "",
    "## Sobre o negócio",
    `Quem somos: ${blank(settings.business_description)}`,
    `O que oferecemos: ${blank(settings.offer)}`,
    `Preços: ${blank(settings.pricing, "não falar valores; dizer que o orçamento depende do escopo e oferecer conversa com o responsável")}`,
    `Tom de voz: ${blank(settings.tone, "cordial, direto, frases curtas, sem formalidade excessiva")}`,
    "",
    "## Sobre o lead",
    `Empresa: ${lead.company_name}`,
    `Segmento: ${blank(lead.segment)} · Cidade: ${[lead.city, lead.state].filter(Boolean).join("/") || "não informada"}`,
    `Serviço que faz sentido oferecer: ${blank(lead.suggested_service)}${lead.suggested_service_detail ? ` (${lead.suggested_service_detail})` : ""}`,
    `O que observamos na pesquisa: ${blank(lead.differentiators)}`,
    `Oportunidade: ${blank(lead.landing_page_opportunity)}`,
    "",
    "## Como responder",
    "- Escreva como uma pessoa no WhatsApp: em português do Brasil, 1 a 3 frases curtas, no máximo uma pergunta por mensagem, sem markdown, listas ou emojis em excesso.",
    "- O objetivo é entender a necessidade, mostrar valor e levar a uma conversa com o responsável. Não feche venda sozinho.",
    "- Nunca invente preços, prazos, garantias, clientes, resultados ou funcionalidades que não estejam acima. Se não souber, diga que vai confirmar com o responsável e use action \"handoff\".",
    "- Se perguntarem se é um robô ou IA, diga com honestidade que é um assistente virtual e que uma pessoa da equipe acompanha a conversa.",
    "- Se a pessoa pedir para não ser mais contatada, peça desculpas em uma frase, não insista e use action \"mark_lost\".",
    "",
    "## Ações (campo action)",
    "- \"none\": só responder.",
    "- \"move_stage\" com stage: quando a etapa mudar claramente (\"Respondeu\" = conversa em andamento, \"Proposta enviada\" = você enviou ou ela pediu proposta formal, \"Fechado\" = confirmou contratação).",
    "- \"schedule_follow_up\" com follow_up_at: quando a pessoa pedir para falar em outro dia/horário. Confirme o horário na resposta.",
    "- \"handoff\" com handoff_reason: chame o vendedor quando pedirem proposta, preço fechado, reunião/ligação, negociação, reclamação, assunto fora do roteiro, ou quando você não tiver segurança. Na resposta, diga que o responsável vai continuar o atendimento em breve.",
    `- Regras extras para chamar o vendedor: ${blank(settings.handoff_rules, "nenhuma")}`,
    "- \"mark_lost\": a pessoa deixou claro que não tem interesse ou pediu para não ser contatada.",
    "",
    `Agora é ${nowText} (horário de Brasília). Use isso para interpretar \"amanhã\", \"semana que vem\" etc.`,
    "Responda SEMPRE no formato JSON pedido.",
  ].join("\n");
}

/**
 * Conversa no formato do Gemini: lead = "user", empresa (vendedor ou IA) = "model".
 * Mensagens seguidas do mesmo lado são unidas, e a conversa sempre começa pelo lead.
 */
export function buildTurns(messages: ConversationMessage[]) {
  const ordered = [...messages].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  const turns: Array<{ role: "user" | "model"; text: string }> = [];
  for (const message of ordered) {
    const role = message.direction === "in" ? "user" : "model";
    const text = message.message.trim();
    if (!text) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text += `\n${text}`;
    else turns.push({ role, text });
  }
  // A primeira mensagem de prospecção (enviada por nós) vira contexto do primeiro turno do lead.
  if (turns[0]?.role === "model") {
    const opening = turns.shift()!;
    const first = turns[0] as (typeof turns)[number] | undefined;
    if (first?.role === "user") first.text = `[Mensagem que enviamos antes: "${opening.text}"]\n${first.text}`;
    else turns.unshift({ role: "user", text: `[Mensagem que enviamos antes: "${opening.text}"]` });
  }
  return turns.slice(-40);
}

/** Valida a decisão da IA. JSON inválido ou incoerente vira handoff (nunca envia algo quebrado). */
export function parseDecision(raw: string, now: Date): AssistantDecision {
  let data: unknown;
  try { data = JSON.parse(raw); } catch {
    return { reply: "", action: "handoff", handoff_reason: "A IA devolveu uma resposta em formato inválido." };
  }
  const parsed = decisionSchema.safeParse(data);
  if (!parsed.success) return { reply: "", action: "handoff", handoff_reason: "A IA devolveu uma resposta incompleta." };
  const decision = { ...parsed.data, reply: parsed.data.reply.replace(/\*\*/g, "").trim() };
  if (decision.action === "move_stage" && !decision.stage) decision.action = "none";
  if (decision.action === "schedule_follow_up") {
    const when = decision.follow_up_at ? new Date(decision.follow_up_at) : null;
    const valid = when && !Number.isNaN(when.getTime()) && when.getTime() > now.getTime() - 60_000 && when.getTime() < now.getTime() + 180 * 86_400_000;
    if (!valid) return { ...decision, action: "handoff", handoff_reason: "O lead pediu retorno, mas a data não ficou clara." };
  }
  if (decision.action === "handoff" && !decision.handoff_reason) decision.handoff_reason = "A IA pediu ajuda do vendedor.";
  return decision;
}

/** Variações do número para achar o lead (WhatsApp às vezes manda celular BR sem o 9). */
export function phoneVariants(raw: string) {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  const variants = new Set([digits]);
  if (digits.startsWith("55") && digits.length === 13 && digits[4] === "9") variants.add(digits.slice(0, 4) + digits.slice(5));
  if (digits.startsWith("55") && digits.length === 12 && /[6-9]/.test(digits[4])) variants.add(`${digits.slice(0, 4)}9${digits.slice(4)}`);
  return [...variants];
}

/** Dentro da janela de 24 h do WhatsApp (só dá para mandar texto livre até 24 h após a última mensagem do lead). */
export function insideWhatsAppWindow(lastInboundAt: string | null | undefined, now = new Date()) {
  if (!lastInboundAt) return false;
  return now.getTime() - new Date(lastInboundAt).getTime() < 24 * 3_600_000 - 5 * 60_000;
}
