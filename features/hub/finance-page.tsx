"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { HandCoins, ReceiptText, TriangleAlert, WalletCards } from "lucide-react";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function FinancePage() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const paymentsQuery = useQuery({
    queryKey: ["finance", organizationId], enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("payments").select("*").eq("organization_id", organizationId!).order("due_date", { ascending: true });
      if (error) throw error; return data || [];
    },
  });
  const careQuery = useQuery({
    queryKey: ["care-mrr", organizationId], enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("care_subscriptions").select("monthly_value,status").eq("organization_id", organizationId!).eq("status", "Ativo");
      if (error) throw error; return data || [];
    },
  });
  const payments = paymentsQuery.data || [];
  const billed = payments.filter((p) => p.status !== "Cancelado").reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const received = payments.filter((p) => p.status === "Pago").reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const pending = payments.filter((p) => p.status === "Pendente").reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const overdue = payments.filter((p) => p.status === "Atrasado" || (p.status === "Pendente" && new Date(p.due_date) < new Date())).reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const mrr = (careQuery.data || []).reduce((sum, row) => sum + Number(row.monthly_value || 0), 0);
  const cards = [
    { label: "Faturado", value: billed, icon: WalletCards }, { label: "Recebido", value: received, icon: ReceiptText }, { label: "A receber", value: pending, icon: HandCoins }, { label: "Atrasado", value: overdue, icon: TriangleAlert }, { label: "Receita recorrente", value: mrr, icon: WalletCards },
  ];
  return <><PageHeader eyebrow="Financeiro" title="Visão geral" description="Controle gerencial de recebimentos e recorrência da LYNK." /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map(({label,value,icon:Icon}) => <Card key={label}><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs text-muted">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-4 text-xl font-semibold">{money(value)}</p></CardContent></Card>)}</div><Card className="mt-5 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-line text-[10px] uppercase tracking-wider text-zinc-600"><tr><th className="px-4 py-3">Descrição</th><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Valor</th></tr></thead><tbody className="divide-y divide-line">{payments.slice(0,12).map((p) => <tr key={p.id}><td className="px-4 py-3 text-zinc-300">{p.description}</td><td className="px-4 py-3 text-zinc-500">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${p.due_date}T12:00:00`))}</td><td className="px-4 py-3"><span className="rounded-md border border-line px-2 py-1 text-xs">{p.status}</span></td><td className="px-4 py-3 text-zinc-300">{money(Number(p.amount || 0))}</td></tr>)}</tbody></table></div></Card></>;
}
