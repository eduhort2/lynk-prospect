import "server-only";

import { GEMINI_DECISION_SCHEMA } from "@/features/assistant/decision";

/**
 * Provedor de IA trocável por variável de ambiente (AI_PROVIDER).
 * Hoje: "gemini" (plano gratuito do Google AI Studio). Para usar outro provedor no futuro,
 * acrescente um caso aqui com a mesma assinatura — o resto do Lynk não muda.
 */
export type AiTurn = { role: "user" | "model"; text: string };

export class AiUnavailableError extends Error {
  constructor(message: string, readonly retryable = false) { super(message); }
}

export function aiConfigured() {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  return provider === "gemini" ? Boolean(process.env.GEMINI_API_KEY) : false;
}

/** Devolve o texto JSON da decisão do assistente. */
export async function generateAssistantJson(system: string, turns: AiTurn[]): Promise<string> {
  const provider = (process.env.AI_PROVIDER || "gemini").toLowerCase();
  if (provider !== "gemini") throw new AiUnavailableError(`Provedor de IA "${provider}" ainda não implementado.`);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiUnavailableError("GEMINI_API_KEY não configurada.");
  // "gemini-flash-latest" acompanha o Flash atual e evita quebrar quando o Google aposenta uma versão.
  const model = process.env.GEMINI_ASSISTANT_MODEL || "gemini-flash-latest";
  const base = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com";

  let response: Response;
  try {
    response = await fetch(`${base}/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 1024, responseMimeType: "application/json", responseSchema: GEMINI_DECISION_SCHEMA },
      }),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    throw new AiUnavailableError(`Sem resposta da IA (${error instanceof Error ? error.name : "erro de rede"}).`, true);
  }
  if (response.status === 429) throw new AiUnavailableError("Limite do plano gratuito da IA atingido.", true);
  if (!response.ok) throw new AiUnavailableError(`IA respondeu com erro ${response.status}.`, response.status >= 500);
  const data = await response.json() as { candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>; promptFeedback?: { blockReason?: string } };
  if (data.promptFeedback?.blockReason) throw new AiUnavailableError(`A IA recusou a mensagem (${data.promptFeedback.blockReason}).`);
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
  if (!text) throw new AiUnavailableError(`A IA não devolveu resposta (${data.candidates?.[0]?.finishReason || "vazio"}).`);
  return text;
}
