import "server-only";

export function normalizeBrazilPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("55")) return digits;
  return digits.length >= 10 ? `55${digits}` : digits;
}

export function whatsappConfig() {
  const token = process.env.WHATSAPP_API_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) throw new Error("WHATSAPP_NOT_CONFIGURED");
  return { token, phoneNumberId, apiVersion: process.env.WHATSAPP_API_VERSION || "v23.0" };
}

export async function sendWhatsAppTemplate(input: { to: string; company: string; city?: string | null }) {
  const config = whatsappConfig();
  const template = process.env.WHATSAPP_TEMPLATE_NAME || "lynk_primeiro_contato";
  const language = process.env.WHATSAPP_TEMPLATE_LANGUAGE || "pt_BR";
  const response = await fetch(`https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizeBrazilPhone(input.to),
      type: "template",
      template: {
        name: template,
        language: { code: language },
        components: [{ type: "body", parameters: [
          { type: "text", parameter_name: "empresa", text: input.company.slice(0, 100) },
          { type: "text", parameter_name: "cidade", text: (input.city || "sua região").slice(0, 100) },
        ] }],
      },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json() as { messages?: Array<{ id: string }>; error?: { message?: string } };
  if (!response.ok || !data.messages?.[0]?.id) throw new Error(`WHATSAPP_SEND_ERROR:${data.error?.message || response.status}`);
  return { id: data.messages[0].id, template };
}
