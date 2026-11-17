import { aiConfigured } from "@/lib/ai/provider";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";

export const runtime = "nodejs";

/** O que já está configurado no servidor (só diz sim/não; nunca devolve chaves). */
export async function GET() {
  try {
    const access = await requireOrganizationAccess();
    return Response.json({
      ai: aiConfigured(),
      aiProvider: (process.env.AI_PROVIDER || "gemini").toLowerCase(),
      whatsapp: Boolean(process.env.WHATSAPP_API_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
      webhook: Boolean(process.env.WHATSAPP_APP_SECRET && process.env.WHATSAPP_VERIFY_TOKEN),
      admin: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      organizationMatches: process.env.WHATSAPP_ORGANIZATION_ID ? process.env.WHATSAPP_ORGANIZATION_ID === access.organizationId : false,
      organizationId: access.organizationId,
    });
  } catch (error) {
    return accessErrorResponse(error);
  }
}
