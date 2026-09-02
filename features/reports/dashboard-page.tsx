"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarClock,
  ContactRound,
  FileCheck2,
  FileText,
  FolderKanban,
  HandCoins,
  HeartHandshake,
  Target,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/features/agenda/use-tasks";
import { useOrganization } from "@/features/auth/organization-provider";
import { useLeads } from "@/features/leads/use-leads";
import { useProjects } from "@/features/projects/use-projects";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const stageColors = [
  "bg-[#78BFD8]",
  "bg-[#5BAFCB]",
  "bg-[#449DB9]",
  "bg-[#328AA7]",
  "bg-[#F27E2D]",
  "bg-[#3A9B68]",
];

export function DashboardPage() {
  const { profile, organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const leadsQuery = useLeads();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();

  const hubQuery = useQuery({
    queryKey: ["hub-dashboard", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const [proposals, contracts, payments, care] = await Promise.all([
        supabase.from("proposals").select("id,status,total").eq("organization_id", organizationId!),
        supabase.from("contracts").select("id,status,value").eq("organization_id", organizationId!),
        supabase.from("payments").select("id,status,amount,due_date,paid_at").eq("organization_id", organizationId!),
        supabase.from("care_subscriptions").select("id,status,monthly_value").eq("organization_id", organizationId!),
      ]);
      const error = proposals.error || contracts.error || payments.error || care.error;
      if (error) throw error;
      return {
        proposals: proposals.data || [],
        contracts: contracts.data || [],
        payments: payments.data || [],
        care: care.data || [],
      };
    },
  });

  const leads = leadsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];
  const hub = hubQuery.data || { proposals: [], contracts: [], payments: [], care: [] };
  const loading = leadsQuery.isLoading || tasksQuery.isLoading || projectsQuery.isLoading || hubQuery.isLoading;

  const activeLeads = leads.filter((lead) => !["Fechado", "Perdido"].includes(lead.status)).length;
  const meetings = leads.filter((lead) => lead.status === "Reunião marcada").length;
  const openProposals = hub.proposals.filter((proposal) => !["Aceita", "Recusada", "Expirada"].includes(proposal.status));
  const awaitingSignature = hub.contracts.filter((contract) => ["Enviado", "Assinado"].includes(contract.status)).length;
  const activeProjects = projects.filter((project) => !["Concluído", "Cancelado"].includes(project.status)).length;
  const received = hub.payments.filter((payment) => payment.status === "Pago").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const receivable = hub.payments.filter((payment) => payment.status === "Pendente").reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const mrr = hub.care.filter((care) => care.status === "Ativo").reduce((sum, care) => sum + Number(care.monthly_value || 0), 0);
  const proposalValue = openProposals.reduce((sum, proposal) => sum + Number(proposal.total || 0), 0);

  const cards = [
    { label: "Leads ativos", value: String(activeLeads), helper: `${leads.length} leads no total`, icon: ContactRound, href: "/leads" },
    { label: "Reuniões", value: String(meetings), helper: "oportunidades nesta etapa", icon: CalendarClock, href: "/agenda" },
    { label: "Propostas abertas", value: String(openProposals.length), helper: money(proposalValue), icon: FileText, href: "/propostas" },
    { label: "A receber", value: money(receivable), helper: "pagamentos pendentes", icon: HandCoins, href: "/financeiro/a-receber" },
    { label: "Receita recorrente", value: money(mrr), helper: "LYNK Care ativo", icon: HeartHandshake, href: "/financeiro/recorrencias" },
  ];

  const funnelStages = [
    { label: "Novo", count: leads.filter((lead) => lead.status === "Novo").length },
    { label: "Contato", count: leads.filter((lead) => ["Contato enviado", "Respondeu"].includes(lead.status)).length },
    { label: "Reunião", count: leads.filter((lead) => lead.status === "Reunião marcada").length },
    { label: "Proposta", count: leads.filter((lead) => lead.status === "Proposta enviada").length },
    { label: "Negociação", count: leads.filter((lead) => lead.status === "Negociação").length },
    { label: "Fechado", count: leads.filter((lead) => lead.status === "Fechado").length },
  ];
  const funnelMax = Math.max(...funnelStages.map((stage) => stage.count), 1);

  const upcoming = [...tasks]
    .filter((task) => task.status === "pendente")
    .sort((a, b) => String(a.scheduled_at).localeCompare(String(b.scheduled_at)))
    .slice(0, 5);

  const attentionProjects = projects
    .filter((project) => !["Concluído", "Cancelado"].includes(project.status))
    .sort((a, b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")))
    .slice(0, 5);

  const firstName = profile?.name?.split(" ")[0];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[.22em] text-accent">Visão geral</p>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Olá{firstName ? `, ${firstName}` : ""}.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">Resumo comercial, operacional e financeiro da LYNK em um único lugar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/leads" className="rounded-lg border border-line bg-card px-3.5 py-2 text-xs font-medium text-zinc-300 transition hover:border-primary/20 hover:text-white">Ver leads</Link>
          <Link href="/tarefas" className="rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-black transition hover:bg-primary-light">Próximas tarefas</Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {loading
          ? Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-32 rounded-xl" />)
          : cards.map(({ label, value, helper, icon: Icon, href }) => (
              <Link key={label} href={href} className="group rounded-xl border border-line/80 bg-card/95 p-4 shadow-panel transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-surface/80 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">{label}</p>
                    <p className="mt-3 truncate text-xl font-semibold tracking-tight text-white sm:text-2xl">{value}</p>
                  </div>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[.055] text-primary transition group-hover:border-accent/20 group-hover:text-accent">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                </div>
                <p className="mt-3 truncate text-[11px] text-zinc-600">{helper}</p>
              </Link>
            ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_.95fr_.9fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Funil comercial</CardTitle>
              <CardDescription>Leads distribuídos pelas principais etapas</CardDescription>
            </div>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            {funnelStages.map((stage, index) => {
              const width = Math.max((stage.count / funnelMax) * 100, stage.count ? 14 : 4);
              const percentage = leads.length ? Math.round((stage.count / leads.length) * 100) : 0;
              return (
                <div key={stage.label}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                    <span className="text-zinc-300">{stage.label}</span>
                    <span className="text-zinc-600">{stage.count} · {percentage}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-white/[.035]">
                    <div className={`h-full rounded-full ${stageColors[index]}`} style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Próximas ações</CardTitle>
              <CardDescription>Follow-ups, reuniões e tarefas pendentes</CardDescription>
            </div>
            <Link href="/tarefas" className="text-xs text-primary hover:text-primary-light">Ver todas</Link>
          </CardHeader>
          <CardContent className="space-y-2 pt-5">
            {upcoming.length ? upcoming.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-xl border border-line/80 bg-background/30 p-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/10 bg-primary/[.04] text-primary"><CalendarClock className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-200">{task.title}</p>
                  <p className="mt-1 truncate text-[10px] text-muted">{task.lead?.company_name || "Tarefa interna"}</p>
                </div>
                <span className="max-w-24 text-right text-[10px] leading-4 text-zinc-500">{formatDate(task.scheduled_at, true)}</span>
              </div>
            )) : <p className="py-12 text-center text-sm text-zinc-600">Nenhuma ação pendente.</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Operação</CardTitle>
              <CardDescription>Pontos que merecem atenção</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-2 xl:grid-cols-1">
            {[
              { label: "Contratos aguardando", value: awaitingSignature, icon: FileCheck2, href: "/contratos" },
              { label: "Projetos ativos", value: activeProjects, icon: FolderKanban, href: "/projetos" },
              { label: "Recebido", value: money(received), icon: WalletCards, href: "/financeiro/recebidos" },
            ].map(({ label, value, icon: Icon, href }) => (
              <Link key={label} href={href} className="flex items-center gap-3 rounded-xl border border-line/80 bg-background/30 p-3.5 transition hover:border-primary/20">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-primary"><Icon className="h-4 w-4" /></span>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted">{label}</p>
                  <p className="mt-1 truncate text-sm font-semibold text-zinc-100">{value}</p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Destaques financeiros</CardTitle>
              <CardDescription>Visão rápida do caixa gerencial</CardDescription>
            </div>
            <Link href="/financeiro" className="text-xs text-primary hover:text-primary-light">Abrir financeiro</Link>
          </CardHeader>
          <CardContent className="grid gap-3 pt-5 sm:grid-cols-3">
            {[
              ["Recebido", money(received)],
              ["A receber", money(receivable)],
              ["Recorrente", money(mrr)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line/80 bg-background/30 p-4">
                <p className="text-[10px] uppercase tracking-[.14em] text-zinc-600">{label}</p>
                <p className="mt-3 text-lg font-semibold tracking-tight text-white">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Projetos que precisam de atenção</CardTitle>
              <CardDescription>Priorizados pelo prazo mais próximo</CardDescription>
            </div>
            <Link href="/projetos" className="text-xs text-primary hover:text-primary-light">Ver projetos</Link>
          </CardHeader>
          <CardContent className="pt-5">
            {attentionProjects.length ? (
              <div className="space-y-2">
                {attentionProjects.map((project) => (
                  <Link key={project.id} href="/projetos" className="grid gap-2 rounded-xl border border-line/80 bg-background/30 p-3.5 transition hover:border-primary/20 sm:grid-cols-[1.2fr_1fr_auto] sm:items-center">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-zinc-200">{project.name}</p>
                      <p className="mt-1 truncate text-[10px] text-muted">{project.client?.company_name || "Cliente não informado"}</p>
                    </div>
                    <span className="text-[11px] text-zinc-500">{project.status}</span>
                    <span className="text-[10px] text-zinc-500">{project.due_date ? formatDate(project.due_date) : "Sem prazo"}</span>
                  </Link>
                ))}
              </div>
            ) : <p className="py-10 text-center text-sm text-zinc-600">Nenhum projeto ativo.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
