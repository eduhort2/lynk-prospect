import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { getStripe } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess(["admin"]);
    const admin = createAdminSupabase();
    const { data } = await admin.from("subscriptions").select("stripe_customer_id").eq("organization_id", access.organizationId).maybeSingle();
    if (!data?.stripe_customer_id) return Response.json({ error: "Sua organização ainda não possui uma assinatura gerenciável." }, { status: 400 });
    const session = await getStripe().billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: `${new URL(request.url).origin}/planos`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STRIPE_")) return Response.json({ error: "Cobrança não configurada" }, { status: 503 });
    return accessErrorResponse(error);
  }
}
