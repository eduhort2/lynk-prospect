import Stripe from "stripe";
import { getStripe, planFromStripePrice } from "@/lib/billing/stripe";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) return Response.json({ error: "Webhook não configurado" }, { status: 503 });

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch {
    return Response.json({ error: "Assinatura do webhook inválida" }, { status: 400 });
  }

  const admin = createAdminSupabase();
  const { data: processed } = await admin.from("webhook_events").select("id").eq("provider_event_id", event.id).maybeSingle();
  if (processed) return Response.json({ received: true, duplicate: true });

  try {
    if (event.type.startsWith("customer.subscription.")) {
      const subscription = event.data.object as Stripe.Subscription;
      const metadata = subscription.metadata || {};
      const organizationId = metadata.organization_id;
      const priceId = subscription.items.data[0]?.price.id;
      const planCode = priceId ? planFromStripePrice(priceId) : null;

      if (organizationId && planCode) {
        const { data: plan } = await admin.from("plans").select("id").eq("code", planCode).single();
        if (!plan) throw new Error("Plano da assinatura não encontrado");
        const raw = subscription as unknown as Record<string, unknown>;
        const periodStart = Number(raw.current_period_start || Math.floor(Date.now() / 1000));
        const periodEnd = Number(raw.current_period_end || Math.floor(Date.now() / 1000));
        const normalizedStatus = subscription.status === "active" || subscription.status === "trialing" || subscription.status === "canceled" || subscription.status === "incomplete"
          ? subscription.status
          : subscription.status === "incomplete_expired" ? "canceled" : "past_due";
        await admin.from("subscriptions").upsert({
          organization_id: organizationId,
          plan_id: plan.id,
          status: normalizedStatus,
          stripe_customer_id: String(subscription.customer),
          stripe_subscription_id: subscription.id,
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        }, { onConflict: "organization_id" });
      }
    }

    await admin.from("webhook_events").insert({
      provider: "stripe",
      provider_event_id: event.id,
      event_type: event.type,
      payload: { id: event.id, type: event.type },
      processed_at: new Date().toISOString(),
    });
    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha no webhook" }, { status: 500 });
  }
}
