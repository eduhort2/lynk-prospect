import { z } from "zod";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

const schema = z.object({ leadId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess();
    const { leadId } = schema.parse(await request.json());
    const { data: lead, error } = await access.supabase.from("leads").select("*").eq("organization_id", access.organizationId).eq("id", leadId).single();
    if (error || !lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });
    if (!lead.whatsapp_opt_in) return Response.json({ error: "Envio bloqueado: registre o consentimento do contato para WhatsApp." }, { status: 409 });
    const phone = lead.whatsapp || lead.phone;
    if (!phone) return Response.json({ error: "Lead sem número de WhatsApp" }, { status: 400 });

    const sent = await sendWhatsAppTemplate({ to: phone, company: lead.company_name, city: lead.city });
    const now = new Date().toISOString();
    await access.supabase.from("whatsapp_messages").insert({ organization_id: access.organizationId, lead_id: lead.id, message: lead.message || "Template de primeiro contato LYNK", template: sent.template, status: "sent", external_id: sent.id, sent_at: now });
    await access.supabase.from("leads").update({ status: "Contato enviado", prospecting_status: "Contato enviado", contacted_at: now, whatsapp_last_message_id: sent.id }).eq("id", lead.id);
    return Response.json({ ok: true, messageId: sent.id });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Lead inválido" }, { status: 400 });
    if (error instanceof Error && error.message === "WHATSAPP_NOT_CONFIGURED") return Response.json({ error: "WhatsApp Cloud API ainda não foi configurada." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("WHATSAPP_SEND_ERROR")) return Response.json({ error: error.message.split(":").slice(1).join(":") || "Falha no envio" }, { status: 502 });
    return accessErrorResponse(error);
  }
}
