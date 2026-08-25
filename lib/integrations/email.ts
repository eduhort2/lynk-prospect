import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char] || char);
}

export async function sendLeadEmail(input: { to: string; company: string; city?: string | null; customMessage?: string | null }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("EMAIL_NOT_CONFIGURED");
  const from = process.env.EMAIL_FROM || "Eduardo da LYNK <contato@lynkhq.com.br>";
  const message = input.customMessage || `Encontrei a ${input.company} durante uma pesquisa de negócios${input.city ? ` em ${input.city}` : ""} e preparei uma observação rápida sobre a presença digital da empresa. Posso enviar por aqui?`;
  const subject = `Uma observação sobre a ${input.company}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;color:#151515;line-height:1.6"><p>Olá, tudo bem?</p><p>${escapeHtml(message)}</p><p>Abraço,<br><strong>Eduardo · LYNK</strong><br><span style="color:#667085">Soluções digitais sob medida</span></p><hr style="border:0;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:12px;color:#667085">Esta é uma abordagem individual da LYNK. Se não quiser receber novos contatos, responda “não tenho interesse”.</p></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [input.to], subject, html, text: `Olá, tudo bem?\n\n${message}\n\nAbraço,\nEduardo · LYNK\nSoluções digitais sob medida\n\nSe não quiser receber novos contatos, responda “não tenho interesse”.` }),
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json() as { id?: string; message?: string };
  if (!response.ok || !data.id) throw new Error(`EMAIL_SEND_ERROR:${data.message || response.status}`);
  return { id: data.id, subject, body: message };
}
