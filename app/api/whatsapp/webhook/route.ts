import { createHmac, timingSafeEqual } from "node:crypto";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { phoneVariants } from "@/features/assistant/decision";
import { runAssistantForLead } from "@/features/assistant/engine";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type WaText = { body?: string };
type WaMessage = { id: string; from: string; to?: string; timestamp?: string; type?: string; text?: WaText };
type WaValue = { messages?: WaMessage[]; message_echoes?: WaMessage[]; statuses?: Array<{ id: string; status: string }> };
type WaPayload = { entry?: Array<{ changes?: Array<{ field?: string; value?: WaValue }> }> };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) return new Response(challenge || "", { status: 200 });
  return new Response("Forbidden", { status: 403 });
}

function validSignature(raw: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

const MEDIA_LABEL: Record<string, string> = { audio: "[áudio]", image: "[imagem]", video: "[vídeo]", document: "[documento]", sticker: "[figurinha]", location: "[localização]", contacts: "[contato]" };

function textOf(message: WaMessage) {
  return message.type === "text" || !message.type ? message.text?.body?.trim() || "" : MEDIA_LABEL[message.type] || `[${message.type}]`;
}

async function findLead(admin: SupabaseClient, organizationId: string, rawPhone: string) {
  const variants = phoneVariants(rawPhone);
  // Pré-filtro pelos 4 últimos dígitos (contíguos em qualquer formatação) e conferência exata em seguida.
  const last4 = variants[0].slice(-4);
  const { data: candidates } = await admin.from("leads").select("id,status,response,whatsapp,phone,last_inbound_at,contacted_at").eq("organization_id", organizationId).or(`whatsapp.ilike.*${last4},phone.ilike.*${last4}`).limit(200);
  return (candidates || []).find((lead) => [lead.whatsapp, lead.phone].some((value) => value && phoneVariants(value).some((v) => variants.includes(v)))) || null;
}

/** Grava a mensagem; se a Meta reenviar o mesmo evento, ignora (índice único por external_id). */
async function store(admin: SupabaseClient, row: Record<string, unknown>) {
  const { error } = await admin.from("whatsapp_messages").insert(row);
  if (error && error.code === "23505") return false;
  if (error) throw error;
  return true;
}

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Invalid signature", { status: 401 });
  const payload = JSON.parse(raw) as WaPayload;
  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
  if (!organizationId) return new Response("Organization not configured", { status: 503 });
  const admin = createAdminSupabase();
  const toAnswer: Array<{ leadId: string; messageId: string }> = [];

  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    const value = change.value || {};

    for (const status of value.statuses || []) {
      if (["sent", "delivered", "read", "failed"].includes(status.status)) await admin.from("whatsapp_messages").update({ status: status.status }).eq("organization_id", organizationId).eq("external_id", status.id);
    }

    // Mensagens que o LEAD mandou.
    for (const message of value.messages || []) {
      const lead = await findLead(admin, organizationId, message.from);
      if (!lead) continue; // número que não é lead: não é guardado
      const body = textOf(message) || "[mensagem]";
      const at = new Date(Number(message.timestamp || Date.now() / 1000) * 1000).toISOString();
      const isNew = await store(admin, { organization_id: organizationId, lead_id: lead.id, message: body, status: "received", external_id: message.id, response_at: at, direction: "in", author: "lead", message_type: message.type || "text" });
      if (!isNew) continue;
      const responseText = [lead.response, `[${new Date(at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}] ${body}`].filter(Boolean).join("\n").slice(-4000);
      const moveToConversation = ["Novo", "Contato enviado"].includes(lead.status);
      await admin.from("leads").update({ last_inbound_at: at, response: responseText, ...(moveToConversation ? { status: "Respondeu", prospecting_status: "Respondeu" } : {}) }).eq("id", lead.id);
      if (message.type && message.type !== "text") {
        // Áudio, imagem etc.: a IA não interpreta; chama você.
        await admin.from("leads").update({ ai_handoff_at: new Date().toISOString(), ai_handoff_reason: `O lead enviou ${body}. Ouça/veja e responda pelo celular.` }).eq("id", lead.id).is("ai_handoff_at", null);
        continue;
      }
      toAnswer.push({ leadId: lead.id, messageId: message.id });
    }

    // Mensagens que VOCÊ mandou pelo app WhatsApp Business (coexistência).
    for (const echo of value.message_echoes || []) {
      if (!echo.to) continue;
      const lead = await findLead(admin, organizationId, echo.to);
      if (!lead) continue;
      const body = textOf(echo) || "[mensagem]";
      const at = new Date(Number(echo.timestamp || Date.now() / 1000) * 1000).toISOString();
      const isNew = await store(admin, { organization_id: organizationId, lead_id: lead.id, message: body, status: "sent", external_id: echo.id, sent_at: at, direction: "out", author: "human", message_type: echo.type || "text" });
      if (!isNew) continue;
      if (lead.last_inbound_at) {
        // Você entrou na conversa pelo celular: a IA para de responder este lead até você devolver.
        await admin.from("leads").update({ ai_handoff_at: at, ai_handoff_reason: "Você respondeu pelo celular." }).eq("id", lead.id).is("ai_handoff_at", null);
      } else {
        await admin.from("leads").update({ contacted_at: lead.contacted_at || at, ...(lead.status === "Novo" ? { status: "Contato enviado", prospecting_status: "Contato enviado" } : {}) }).eq("id", lead.id);
      }
    }
  }

  // Responde à Meta na hora; o assistente roda em seguida (a Meta reenvia eventos lentos).
  if (toAnswer.length) {
    after(async () => {
      // Espera alguns segundos: se o lead mandar várias mensagens seguidas, responde só a última.
      await new Promise((resolve) => setTimeout(resolve, Number(process.env.ASSISTANT_DEBOUNCE_MS ?? 4000)));
      for (const item of toAnswer) {
        try {
          const result = await runAssistantForLead(admin, organizationId, item.leadId, item.messageId);
          console.info("[assistente]", item.leadId, result.status, result.status === "skipped" ? result.reason : result.decision.action);
        }
        catch (error) { console.error("[assistente]", item.leadId, error instanceof Error ? error.message : error); }
      }
    });
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
}
