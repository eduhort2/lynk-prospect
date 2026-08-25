import { z } from "zod";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { sendLeadEmail } from "@/lib/integrations/email";

const schema = z.object({ leadId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess();
    const { leadId } = schema.parse(await request.json());
    const { data: lead, error } = await access.supabase.from("leads").select("*").eq("organization_id", access.organizationId).eq("id", leadId).single();
    if (error || !lead) return Response.json({ error: "Lead não encontrado" }, { status: 404 });
    if (!lead.email) return Response.json({ error: "Lead sem e-mail" }, { status: 400 });
    const sent = await sendLeadEmail({ to: lead.email, company: lead.company_name, city: lead.city, customMessage: lead.message });
    const now = new Date().toISOString();
    await access.supabase.from("email_messages").insert({ organization_id: access.organizationId, lead_id: lead.id, subject: sent.subject, body: sent.body, status: "sent", external_id: sent.id, sent_at: now });
    await access.supabase.from("leads").update({ status: "Contato enviado", prospecting_status: "Contato enviado", contacted_at: now, email_status: "sent" }).eq("id", lead.id);
    return Response.json({ ok: true, emailId: sent.id });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Lead inválido" }, { status: 400 });
    if (error instanceof Error && error.message === "EMAIL_NOT_CONFIGURED") return Response.json({ error: "Envio por e-mail ainda não foi configurado." }, { status: 503 });
    if (error instanceof Error && error.message.startsWith("EMAIL_SEND_ERROR")) return Response.json({ error: error.message.split(":").slice(1).join(":") || "Falha no envio" }, { status: 502 });
    return accessErrorResponse(error);
  }
}
