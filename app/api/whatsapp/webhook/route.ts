import { createHmac, timingSafeEqual } from "node:crypto";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { normalizeBrazilPhone } from "@/lib/integrations/whatsapp";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  const raw = await request.text();
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Invalid signature", { status: 401 });
  const payload = JSON.parse(raw) as { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ id: string; from: string; timestamp?: string; text?: { body?: string } }>; statuses?: Array<{ id: string; status: string }> } }> }> };
  const admin = createAdminSupabase();
  const organizationId = process.env.WHATSAPP_ORGANIZATION_ID;
  if (!organizationId) return new Response("Organization not configured", { status: 503 });

  for (const entry of payload.entry || []) for (const change of entry.changes || []) {
    for (const status of change.value?.statuses || []) {
      if (["sent", "delivered", "read", "failed"].includes(status.status)) await admin.from("whatsapp_messages").update({ status: status.status }).eq("external_id", status.id);
    }
    for (const message of change.value?.messages || []) {
      const phone = normalizeBrazilPhone(message.from);
      const { data: leads } = await admin.from("leads").select("id,response").eq("organization_id", organizationId).or(`whatsapp.eq.${phone},phone.eq.${phone}`).limit(1);
      let lead = leads?.[0];
      if (!lead) {
        const { data: candidates } = await admin.from("leads").select("id,response,whatsapp,phone").eq("organization_id", organizationId);
        lead = candidates?.find((candidate: { id: string; response: string | null; whatsapp: string | null; phone: string | null }) => normalizeBrazilPhone(candidate.whatsapp || candidate.phone || "") === phone);
      }
      if (!lead) continue;
      const body = message.text?.body?.trim() || "Mensagem recebida no WhatsApp";
      const responseText = [lead.response, `[${new Date(Number(message.timestamp || Date.now() / 1000) * 1000).toLocaleString("pt-BR")}] ${body}`].filter(Boolean).join("\n");
      await admin.from("whatsapp_messages").insert({ organization_id: organizationId, lead_id: lead.id, message: body, status: "received", external_id: message.id, response_at: new Date().toISOString() });
      await admin.from("leads").update({ status: "Respondeu", prospecting_status: "Respondeu", response: responseText }).eq("id", lead.id);
    }
  }
  return new Response("EVENT_RECEIVED", { status: 200 });
}
