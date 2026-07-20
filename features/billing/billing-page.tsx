"use client";

import { Check, CreditCard, ExternalLink, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useSubscription } from "@/features/billing/use-subscription";
import { commercialPlans } from "@/lib/billing/plans";
import type { PlanCode } from "@/types";

async function openBillingEndpoint(endpoint: string, body?: unknown) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível abrir a cobrança");
  if (data.url) window.location.assign(data.url);
}

export function BillingPage() {
  const subscription = useSubscription();
  const currentCode = (subscription.data?.plan?.code || "free") as PlanCode;
  const [loading, setLoading] = useState<PlanCode | "portal" | null>(null);

  async function choosePlan(plan: PlanCode) {
    if (plan === currentCode || plan === "free") return;
    setLoading(plan);
    try {
      await openBillingEndpoint("/api/billing/checkout", { plan });
    } catch (error) {
      toast.error("Assinatura indisponível", { description: error instanceof Error ? error.message : "Tente novamente" });
      setLoading(null);
    }
  }

  async function manageSubscription() {
    setLoading("portal");
    try {
      await openBillingEndpoint("/api/billing/portal");
    } catch (error) {
      toast.error("Não foi possível abrir o portal", { description: error instanceof Error ? error.message : "Tente novamente" });
      setLoading(null);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Assinatura"
        title="Plano e cobrança"
        description="Escolha a capacidade adequada para sua operação. O limite é aplicado por organização e renovado a cada ciclo."
        actions={currentCode !== "free" ? <Button variant="secondary" onClick={manageSubscription} disabled={loading === "portal"}><ExternalLink className="h-4 w-4" /> Gerenciar assinatura</Button> : undefined}
      />

      <div className="mb-5 flex items-center justify-between rounded-xl border border-line bg-card px-5 py-4">
        <div><p className="text-xs text-zinc-500">Plano atual</p><p className="mt-1 text-lg font-semibold">{subscription.data?.plan?.name || "Gratuito"}</p></div>
        <Badge tone={currentCode === "free" ? "gray" : "blue"}>{subscription.data?.subscription?.status || "active"}</Badge>
      </div>

      <div className="grid gap-4 xl:grid-cols-4">
        {commercialPlans.map((plan) => {
          const selected = currentCode === plan.code;
          return (
            <Card key={plan.code} className={plan.highlight ? "border-primary/45" : undefined}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between"><h2 className="text-base font-semibold">{plan.name}</h2>{plan.highlight ? <Badge tone="blue">Mais escolhido</Badge> : null}</div>
                <p className="mt-2 min-h-10 text-xs leading-relaxed text-zinc-500">{plan.description}</p>
                <div className="my-6"><span className="text-3xl font-semibold tracking-tight">R$ {plan.price}</span><span className="text-xs text-zinc-600">/mês</span></div>
                <div className="mb-6 space-y-3 border-y border-line py-5">
                  {plan.features.map((feature) => <div key={feature} className="flex gap-2 text-xs text-zinc-300"><Check className="h-4 w-4 shrink-0 text-primary" />{feature}</div>)}
                </div>
                <p className="mb-4 text-[11px] text-zinc-500">{plan.members} usuário(s) · {plan.storedLeads.toLocaleString("pt-BR")} leads · {plan.prospectingCredits.toLocaleString("pt-BR")} créditos</p>
                <Button className="w-full" variant={selected ? "secondary" : plan.highlight ? "default" : "outline"} disabled={selected || loading !== null || plan.code === "free"} onClick={() => choosePlan(plan.code)}>
                  {selected ? "Plano atual" : loading === plan.code ? "Abrindo checkout..." : plan.code === "free" ? "Incluído" : "Escolher plano"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl border border-line bg-card p-5 text-xs leading-relaxed text-zinc-500">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p>Os pagamentos são processados pela Stripe. A LYNK Prospect não armazena número completo de cartão nem código de segurança.</p>
      </div>
    </>
  );
}
