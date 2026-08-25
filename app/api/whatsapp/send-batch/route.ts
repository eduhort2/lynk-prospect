import { z } from "zod";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

const schema = z.object({ leadIds: z.array(z.string().uuid()).max(100) });

export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess(["admin", "manager"]);
    const { leadIds } = schema.parse(await request.json());
    if (process.env.WHATSAPP_AUTO_SEND_ON_IMPORT !== "true") return Response.json({ sent: 0, skipped: leadIds.length, disabled: true });
    const { data: leads, error } = await access.supabase.from("leads").select("*").eq("organization_id", access.organizationId).in("id", leadIds);
    if (error) throw error;
    let sentCount = 0;
    let skipped = 0;
    for (const lead of leads || []) {
      const phone = lead.whatsapp || lead.phone;
      if (!lead.whatsapp_opt_in || !phone || lead.contacted_at) { skipped += 1; continue; }
      try {
        const sent = await sendWhatsAppTemplate({ to: phone, company: lead.company_name, city: lead.city });
        const now = new Date().toISOString();
        await access.supabase.from("whatsapp_messages").insert({ organization_id: access.organizationId, lead_id: lead.id, message: lead.message || "Template de primeiro contato LYNK", template: sent.template, status: "sent", external_id: sent.id, sent_at: now });
        await access.supabase.from("leads").update({ status: "Contato enviado", prospecting_status: "Contato enviado", contacted_at: now, whatsapp_last_message_id: sent.id }).eq("id", lead.id);
        sentCount += 1;
      } catch { skipped += 1; }
    }
    return Response.json({ sent: sentCount, skipped });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: "Lista de leads inválida" }, { status: 400 });
    return accessErrorResponse(error);
  }
}
