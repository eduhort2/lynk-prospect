import "server-only";

import Stripe from "stripe";
import type { PlanCode } from "@/types";

export function getStripe() {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(secret);
}

export function getStripePriceId(plan: Exclude<PlanCode, "free">) {
  const priceIds: Record<Exclude<PlanCode, "free">, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    pro: process.env.STRIPE_PRICE_PRO,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  const priceId = priceIds[plan];
  if (!priceId) throw new Error("STRIPE_PRICE_NOT_CONFIGURED");
  return priceId;
}

export function planFromStripePrice(priceId: string): Exclude<PlanCode, "free"> | null {
  const entries: Array<[Exclude<PlanCode, "free">, string | undefined]> = [
    ["starter", process.env.STRIPE_PRICE_STARTER],
    ["pro", process.env.STRIPE_PRICE_PRO],
    ["business", process.env.STRIPE_PRICE_BUSINESS],
  ];
  return entries.find(([, id]) => id === priceId)?.[0] || null;
}
