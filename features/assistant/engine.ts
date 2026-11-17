import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { AiUnavailableError, generateAssistantJson } from "@/lib/ai/provider";
import { sendWhatsAppText } from "@/lib/integrations/whatsapp";
import { buildSystemPrompt, buildTurns, insideWhatsAppWindow, parseDecision, type AssistantDecision, type AssistantSettings, type ConversationMessage } from "./decision";

const STAGE_ORDER = ["Novo", "Contato enviado", "Respondeu", "Reunião marcada", "Proposta enviada", "Negociação", "Fechado", "Perdido"];

type LeadRow = {
  id: string; organization_id: string; company_name: string; segment: string | null; city: string | null; state: string | null;
  suggested_service: string | null; suggested_service_detail: string | null; differentiators: string | null; landing_page_opportunity: string | null;
  status: string; whatsapp: string | null; phone: string | null; responsible_user: string | null;
  ai_paused: boolean; ai_handoff_at: string | null; last_inbound_at: string | null;
};

export type AssistantRunResult =
  | { status: "skipped"; reason: string }
  | { status: "replied" | "handoff" | "silent"; decision: AssistantDecision };

/** Decide (sem efeitos colaterais) a resposta para uma conversa. Usado pelo simulador e pelo webhook. */
export async function decideReply(settings: AssistantSettings, lead: Parameters<typeof buildSystemPrompt>[1], messages: ConversationMessage[], now = new Date()) {
  const turns = buildTurns(messages);
  if (!turns.length || turns[turns.length - 1].role !== "user") return { reply: "", action: "none" } as AssistantDecision;
  const raw = await generateAssistantJson(buildSystemPrompt(settings, lead, now), turns);
  return parseDecision(raw, now);
}

async function handoff(admin: SupabaseClient, lead: LeadRow, reason: string) {
  await admin.from("leads").update({ ai_handoff_at: new Date().toISOString(), ai_handoff_reason: reason.slice(0, 300) }).eq("id", lead.id);
  if (lead.responsible_user) {
    await admin.from("tasks").insert({ organization_id: lead.organization_id, lead_id: lead.id, user_id: lead.responsible_user, title: `Responder ${lead.company_name} (IA pediu ajuda)`, description: reason.slice(0, 500), scheduled_at: new Date().toISOString(), status: "pendente" });
  }
}

/**
 * Roda o assistente para a última mensagem do lead: decide, envia pelo WhatsApp e aplica a ação.
 * Nunca envia nada se a IA estiver desligada, pausada no lead, já tiver chamado o vendedor,
 * ou fora da janela de 24 h.
 */
export async function runAssistantForLead(admin: SupabaseClient, organizationId: string, leadId: string, triggerMessageId: string): Promise<AssistantRunResult> {
  const { data: settings } = await admin.from("assistant_settings").select("*").eq("organization_id", organizationId).maybeSingle();
  if (!settings?.enabled) return { status: "skipped", reason: "assistente desligado" };

  const { data: lead } = await admin.from("leads").select("id,organization_id,company_name,segment,city,state,suggested_service,suggested_service_detail,differentiators,landing_page_opportunity,status,whatsapp,phone,responsible_user,ai_paused,ai_handoff_at,last_inbound_at").eq("id", leadId).maybeSingle() as { data: LeadRow | null };
  if (!lead) return { status: "skipped", reason: "lead não encontrado" };
  if (lead.ai_paused) return { status: "skipped", reason: "IA pausada neste lead" };
  if (lead.ai_handoff_at) return { status: "skipped", reason: "aguardando o vendedor" };
  if (!insideWhatsAppWindow(lead.last_inbound_at)) return { status: "skipped", reason: "fora da janela de 24 h" };

  const { data: history } = await admin.from("whatsapp_messages").select("id,direction,author,message,created_at,external_id").eq("lead_id", leadId).order("created_at", { ascending: true }).limit(80);
  const messages = (history || []) as Array<ConversationMessage & { id: string; external_id: string | null }>;
  // Várias mensagens seguidas: só a última dispara a resposta (as anteriores entram no contexto).
  const lastInbound = [...messages].reverse().find((message) => message.direction === "in");
  if (!lastInbound || lastInbound.external_id !== triggerMessageId) return { status: "skipped", reason: "há mensagem mais recente" };
  if (messages[messages.length - 1]?.direction === "out") return { status: "skipped", reason: "já respondido" };

  let decision: AssistantDecision;
  try {
    decision = await decideReply(settings, lead, messages);
  } catch (error) {
    const reason = error instanceof AiUnavailableError ? `IA indisponível: ${error.message}` : "IA indisponível no momento.";
    await handoff(admin, lead, reason);
    return { status: "handoff", decision: { reply: "", action: "handoff", handoff_reason: reason } };
  }

  // Confere de novo: se você respondeu ou pausou enquanto a IA pensava, ela não envia.
  const { data: fresh } = await admin.from("leads").select("ai_paused,ai_handoff_at").eq("id", leadId).maybeSingle();
  if (fresh?.ai_paused || fresh?.ai_handoff_at) return { status: "skipped", reason: "você assumiu a conversa" };

  if (decision.reply) {
    try {
      const sent = await sendWhatsAppText({ to: lead.whatsapp || lead.phone || "", body: decision.reply });
      await admin.from("whatsapp_messages").insert({ organization_id: organizationId, lead_id: leadId, message: decision.reply, status: "sent", external_id: sent.id, sent_at: new Date().toISOString(), direction: "out", author: "ai" });
    } catch (error) {
      await handoff(admin, lead, `Falha ao enviar a resposta da IA: ${error instanceof Error ? error.message.replace("WHATSAPP_SEND_ERROR:", "") : "erro"}`);
      return { status: "handoff", decision };
    }
  }

  const updates: Record<string, unknown> = {};
  if (decision.action === "move_stage" && decision.stage && STAGE_ORDER.indexOf(decision.stage) > STAGE_ORDER.indexOf(lead.status)) updates.status = decision.stage;
  if (decision.action === "mark_lost") updates.status = "Perdido";
  if (Object.keys(updates).length) await admin.from("leads").update({ ...updates, prospecting_status: updates.status }).eq("id", leadId);

  if (decision.action === "schedule_follow_up" && decision.follow_up_at && lead.responsible_user) {
    await admin.from("tasks").insert({ organization_id: organizationId, lead_id: leadId, user_id: lead.responsible_user, title: `Retorno: ${lead.company_name}`, description: "Agendado pelo assistente de IA a pedido do lead.", scheduled_at: new Date(decision.follow_up_at).toISOString(), status: "pendente" });
  }
  if (decision.action === "handoff") {
    await handoff(admin, lead, decision.handoff_reason || "A IA pediu ajuda do vendedor.");
    return { status: "handoff", decision };
  }
  return { status: decision.reply ? "replied" : "silent", decision };
}
