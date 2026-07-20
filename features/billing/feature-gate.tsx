"use client";

import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSubscription } from "@/features/billing/use-subscription";

export function FeatureGate({ feature, title, children }: { feature: string; title: string; children: ReactNode }) {
  const subscription = useSubscription();
  if (subscription.isLoading) return <Skeleton className="h-72" />;
  const features = (subscription.data?.plan?.features || {}) as Record<string, boolean>;
  if (features[feature] || subscription.data?.plan?.code === "business") return <>{children}</>;
  return (
    <Card className="mx-auto mt-16 max-w-xl"><CardContent className="flex flex-col items-center p-10 text-center">
      <div className="mb-5 rounded-xl border border-line bg-white/[.04] p-3"><LockKeyhole className="h-5 w-5 text-primary" /></div>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">Esse recurso não está incluído no plano atual. Faça o upgrade para liberar o acesso para toda a equipe.</p>
      <Link href="/planos" className="mt-6"><Button>Comparar planos</Button></Link>
    </CardContent></Card>
  );
}
