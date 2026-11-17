import { z } from "zod";
import { decideReply } from "@/features/assistant/engine";
import { AiUnavailableError, aiConfigured } from "@/lib/ai/provider";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";

export const runtime = "nodejs";
export const maxDuration = 30;

const text = z.string().trim().max(2000).optional().nullable();
const schema = z.object({
  settings: z.object({ business_description: text, offer: text, pricing: text, tone: text, handoff_rules: text, signature: text }),
  leadId: z.string().uuid().optional().nullable(),
  conversation: z.array(z.object({ direction: z.enum(["in", "out"]), message: z.string().trim().min(1).max(2000) })).min(1).max(30),
});

/** Simulador: mostra o que a IA responderia, sem enviar nada no WhatsApp e sem alterar o lead. */
export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess();
    const input = schema.parse(await request.json());
    if (!aiConfigured()) return Response.json({ error: "A IA não está configurada. Cadastre GEMINI_API_KEY nas variáveis de ambiente." }, { status: 503 });
    let lead: Parameters<typeof decideReply>[1] = { company_name: "Empresa de exemplo", segment: "Comércio", city: "Curitiba", state: "PR", suggested_service: "Site" };
    if (input.leadId) {
      const { data } = await access.supabase.from("leads").select("company_name,segment,city,state,suggested_service,suggested_service_detail,differentiators,landing_page_opportunity,status").eq("organization_id", access.organizationId).eq("id", input.leadId).maybeSingle();
      if (data) lead = data;
    }
    const base = Date.now() - input.conversation.length * 60_000;
    const messages = input.conversation.map((item, index) => ({ ...item, created_at: new Date(base + index * 60_000).toISOString() }));
    const decision = await decideReply(input.settings, lead, messages);
    return Response.json({ decision });
  } catch (error) {
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    if (error instanceof AiUnavailableError) return Response.json({ error: error.message }, { status: 502 });
    return accessErrorResponse(error);
  }
}
