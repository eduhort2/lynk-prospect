import { z } from "zod";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { getStripe, getStripePriceId } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

const checkoutSchema = z.object({ plan: z.enum(["starter", "pro", "business"]) });

export async function POST(request: Request) {
  try {
    const access = await requireOrganizationAccess(["admin"]);
    const input = checkoutSchema.parse(await request.json());
    const stripe = getStripe();
    const admin = createAdminSupabase();
    const origin = new URL(request.url).origin;

    const { data: current } = await admin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", access.organizationId)
      .maybeSingle();

    let customerId = current?.stripe_customer_id as string | null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: access.user.email,
        metadata: { organization_id: access.organizationId, user_id: access.user.id },
      });
      customerId = customer.id;
      await admin.from("subscriptions").update({ stripe_customer_id: customerId, updated_at: new Date().toISOString() }).eq("organization_id", access.organizationId);
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: getStripePriceId(input.plan), quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/planos?checkout=success`,
      cancel_url: `${origin}/planos?checkout=canceled`,
      metadata: { organization_id: access.organizationId, plan_code: input.plan },
      subscription_data: { metadata: { organization_id: access.organizationId, plan_code: input.plan } },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("STRIPE_")) {
      return Response.json({ error: "A cobrança ainda não foi configurada pelo administrador da LYNK." }, { status: 503 });
    }
    if (error instanceof z.ZodError) return Response.json({ error: "Plano inválido" }, { status: 400 });
    return accessErrorResponse(error);
  }
}
