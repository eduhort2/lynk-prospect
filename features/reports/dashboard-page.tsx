"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ContactRound, FileCheck2, FileText, FolderKanban, HandCoins, HeartHandshake, WalletCards } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/features/agenda/use-tasks";
import { useOrganization } from "@/features/auth/organization-provider";
import { useLeads } from "@/features/leads/use-leads";
import { useProjects } from "@/features/projects/use-projects";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export function DashboardPage() {
  const { profile, organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const leadsQuery = useLeads();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const hubQuery = useQuery({
    queryKey: ["hub-dashboard", organizationId], enabled: Boolean(organizationId),
    queryFn: async () => {
      const [proposals, contracts, payments, care] = await Promise.all([
        supabase.from("proposals").select("id,status,total").eq("organization_id", organizationId!),
        supabase.from("contracts").select("id,status,value").eq("organization_id", organizationId!),
        supabase.from("payments").select("id,status,amount,due_date,paid_at").eq("organization_id", organizationId!),
        supabase.from("care_subscriptions").select("id,status,monthly_value").eq("organization_id", organizationId!),
      ]);
      const error = proposals.error || contracts.error || payments.error || care.error;
      if (error) throw error;
      return { proposals: proposals.data || [], contracts: contracts.data || [], payments: payments.data || [], care: care.data || [] };
    },
  });

  const leads = leadsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];
  const hub = hubQuery.data || { proposals: [], contracts: [], payments: [], care: [] };
  const activeLeads = leads.filter((lead) => !["Fechado", "Perdido"].includes(lead.status)).length;
  const meetings = leads.filter((lead) => lead.status === "Reunião marcada").length;
  const openProposals = hub.proposals.filter((p) => !["Aceita", "Recusada", "Expirada"].includes(p.status)).length;
  const awaitingSignature = hub.contracts.filter((c) => ["Enviado", "Assinado"].includes(c.status)).length;
  const activeProjects = projects.filter((project) => !["Concluído", "Cancelado"].includes(project.status)).length;
  const received = hub.payments.filter((p) => p.status === "Pago").reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const receivable = hub.payments.filter((p) => p.status === "Pendente").reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const mrr = hub.care.filter((c) => c.status === "Ativo").reduce((sum, c) => sum + Number(c.monthly_value || 0), 0);
  const loading = leadsQuery.isLoading || tasksQuery.isLoading || projectsQuery.isLoading || hubQuery.isLoading;
  const cards = [
    { label: "Leads ativos", value: activeLeads, icon: ContactRound },
    { label: "Reuniões", value: meetings, icon: CalendarClock },
    { label: "Propostas abertas", value: openProposals, icon: FileText },
    { label: "Contratos p/ assinatura", value: awaitingSignature, icon: FileCheck2 },
    { label: "Projetos ativos", value: activeProjects, icon: FolderKanban },
    { label: "Recebido", value: money(received), icon: WalletCards },
    { label: "A receber", value: money(receivable), icon: HandCoins },
    { label: "Receita recorrente", value: money(mrr), icon: HeartHandshake },
  ];
  const attentionProjects = projects.filter((project) => !["Concluído", "Cancelado"].includes(project.status)).sort((a,b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999"))).slice(0,6);
  const upcoming = tasks.filter((task) => task.status === "pendente").slice(0,6);
  const stages = ["Novo","Contato enviado","Respondeu","Reunião marcada","Proposta enviada","Negociação","Fechado"];

  return <>
    <PageHeader eyebrow="Visão geral" title={`LYNK Hub${profile?.name ? ` · ${profile.name.split(" ")[0]}` : ""}`} description="Resumo comercial, operacional e financeiro da LYNK." />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{loading ? Array.from({length:8}).map((_,i)=><Skeleton key={i} className="h-28" />) : cards.map(({label,value,icon:Icon}) => <Card key={label}><CardContent className="p-5"><div className="flex items-center justify-between"><p className="text-xs text-muted">{label}</p><Icon className="h-4 w-4 text-primary" /></div><p className="mt-4 text-xl font-semibold tracking-tight">{value}</p></CardContent></Card>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
      <Card><CardHeader><div><CardTitle>Funil comercial</CardTitle><CardDescription>Distribuição atual por etapa</CardDescription></div></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{stages.map((stage) => <div key={stage} className="rounded-xl border border-line bg-[#0B0C0C] p-4"><p className="text-[10px] uppercase tracking-wider text-zinc-600">{stage}</p><p className="mt-2 text-2xl font-semibold">{leads.filter((lead) => lead.status === stage).length}</p></div>)}</div></CardContent></Card>
      <Card><CardHeader><div><CardTitle>Próximas ações</CardTitle><CardDescription>Follow-ups, reuniões e tarefas pendentes</CardDescription></div><Link href="/tarefas" className="text-xs text-primary-light hover:underline">Ver tarefas</Link></CardHeader><CardContent className="space-y-2">{upcoming.length ? upcoming.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-line p-3"><CalendarClock className="h-4 w-4 text-primary" /><div className="min-w-0 flex-1"><p className="truncate text-xs text-zinc-200">{task.title}</p><p className="mt-1 text-[10px] text-zinc-600">{task.lead?.company_name || "Tarefa interna"}</p></div><span className="text-[10px] text-zinc-500">{formatDate(task.scheduled_at, true)}</span></div>) : <p className="py-10 text-center text-sm text-zinc-600">Nenhuma ação pendente.</p>}</CardContent></Card>
    </div>
    <Card className="mt-5"><CardHeader><div><CardTitle>Projetos que precisam de atenção</CardTitle><CardDescription>Projetos ativos priorizados pelo prazo</CardDescription></div><Link href="/projetos" className="text-xs text-primary-light hover:underline">Ver projetos</Link></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-wider text-zinc-600"><tr><th className="py-2">Cliente</th><th>Projeto</th><th>Etapa</th><th>Prazo</th></tr></thead><tbody className="divide-y divide-line">{attentionProjects.map((project) => <tr key={project.id}><td className="py-3 text-zinc-400">{project.client?.company_name || "—"}</td><td className="text-zinc-200">{project.name}</td><td className="text-zinc-400">{project.status}</td><td className="text-zinc-400">{project.due_date ? formatDate(project.due_date) : "Sem prazo"}</td></tr>)}</tbody></table></div></CardContent></Card>
  </>;
}
