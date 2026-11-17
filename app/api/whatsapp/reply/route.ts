import { z } from "zod";
import { insideWhatsAppWindow } from "@/features/assistant/decision";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { sendWhatsAppText } from "@/lib/integrations/whatsapp";

export const runtime = "nodejs";

const schema = z.object({ leadId: z.string().uuid(), text: z.string().trim().min(1, "Escreva a mensagem").max(4000) });

/** Você responde pelo próprio Lynk (pela API), dentro da janela de 24 h do WhatsApp. */
export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess();
    const input = schema.parse(await request.json());
    const { data: lead } = await access.supabase.from("leads").select("id,whatsapp,phone,last_inbound_at").eq("organization_id", access.organizationId).eq("id", input.leadId).maybeSingle();
    if (!lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });
    if (!insideWhatsAppWindow(lead.last_inbound_at)) return Response.json({ error: "Passaram mais de 24 h desde a última mensagem do lead. Pelas regras do WhatsApp, responda pelo celular." }, { status: 409 });
    const sent = await sendWhatsAppText({ to: lead.whatsapp || lead.phone || "", body: input.text });
    const now = new Date().toISOString();
    await access.supabase.from("whatsapp_messages").insert({ organization_id: access.organizationId, lead_id: lead.id, message: input.text, status: "sent", external_id: sent.id, sent_at: now, direction: "out", author: "human" });
    // Você assumiu: a IA não responde este lead até você devolver.
    await access.supabase.from("leads").update({ ai_handoff_at: now, ai_handoff_reason: "Você assumiu a conversa pelo Lynk." }).eq("id", lead.id).is("ai_handoff_at", null);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    if (error instanceof Error && error.message === "WHATSAPP_NOT_CONFIGURED") return Response.json({ error: "A API do WhatsApp ainda não foi configurada." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("WHATSAPP_SEND_ERROR")) return Response.json({ error: `O WhatsApp recusou o envio: ${error.message.split(":").slice(1).join(":")}` }, { status: 502 });
    return accessErrorResponse(error);
  }
}
