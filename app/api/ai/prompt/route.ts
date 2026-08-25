import { z } from "zod";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { buildLandingPagePrompt } from "@/features/prompts/prompt-builder";
import { promptSchema } from "@/lib/validations/prompt";

export const runtime = "nodejs";

const requestSchema = z.object({ values: promptSchema, basePrompt: z.string().min(50).max(12000) });

export async function POST(request: Request) {
  try {
    await requireOrganizationAccess();
    const apiKey = process.env.GEMINI_API_KEY;
    const input = requestSchema.parse(await request.json());
    if (!apiKey) return Response.json({ prompt: buildLandingPagePrompt(input.values), mode: "local" });

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "Você é um diretor de produto da LYNK. Melhore instruções para criação de sites sem inventar fatos. Preserve todos os dados confirmados, use português do Brasil e devolva somente o prompt final, sem markdown externo nem comentários." }] },
        contents: [{ role: "user", parts: [{ text: `Revise e torne mais específico este prompt de produção. Não acrescente preços, avaliações, endereço, serviços ou promessas que não estejam no briefing.\n\n${input.basePrompt}` }] }],
        generationConfig: { temperature: 0.35, maxOutputTokens: 2800 },
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`GEMINI_ERROR_${response.status}`);
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    const prompt = data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!prompt) throw new Error("GEMINI_EMPTY_RESPONSE");
    return Response.json({ prompt, mode: "ai", model });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    if (error instanceof Error && error.message.startsWith("GEMINI_")) return Response.json({ error: "A IA econômica está indisponível agora. O prompt local continua funcionando." }, { status: 502 });
    return accessErrorResponse(error);
  }
}
