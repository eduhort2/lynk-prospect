"use client";

import { ArrowUpRight, BriefcaseBusiness, CalendarClock, ContactRound, FolderKanban, MessageSquareText, Target, UsersRound } from "lucide-react";
import Link from "next/link";
import { FunnelCommercialChart, UserPerformanceChart, WeeklyEvolutionChart } from "@/components/charts/dashboard-charts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useTasks } from "@/features/agenda/use-tasks";
import { useMembers } from "@/features/auth/use-members";
import { useOrganization } from "@/features/auth/organization-provider";
import { useLeads } from "@/features/leads/use-leads";
import { useProjects } from "@/features/projects/use-projects";
import { formatDate } from "@/lib/utils";
import { funnelData, performanceData, weeklyLeadData } from "./report-utils";

export function DashboardPage() {
  const { profile } = useOrganization();
  const leadsQuery = useLeads();
  const tasksQuery = useTasks();
  const projectsQuery = useProjects();
  const membersQuery = useMembers();
  const leads = leadsQuery.data || [];
  const tasks = tasksQuery.data || [];
  const projects = projectsQuery.data || [];
  const newLeads = leads.filter((lead) => lead.status === "Novo").length;
  const messages = leads.filter((lead) => lead.status !== "Novo").length;
  const replies = leads.filter((lead) => ["Respondeu", "Reunião marcada", "Proposta enviada", "Negociação", "Fechado"].includes(lead.status)).length;
  const closed = leads.filter((lead) => lead.status === "Fechado").length;
  const conversion = leads.length ? ((closed / leads.length) * 100).toFixed(1) : "0,0";
  const activeProjects = projects.filter((project) => project.status !== "Publicado").length;
  const upcoming = tasks.filter((task) => task.status === "pendente" && new Date(task.scheduled_at) >= new Date()).slice(0, 5);
  const loading = leadsQuery.isLoading || tasksQuery.isLoading || projectsQuery.isLoading;

  const cards = [
    { label: "Total de leads", value: leads.length, icon: ContactRound, note: `${newLeads} aguardando contato` },
    { label: "Novos leads", value: newLeads, icon: UsersRound, note: "Priorize a primeira abordagem" },
    { label: "Mensagens enviadas", value: messages, icon: MessageSquareText, note: "Leads que avançaram do novo" },
    { label: "Respostas", value: replies, icon: BriefcaseBusiness, note: "Conversas com interesse" },
    { label: "Projetos ativos", value: activeProjects, icon: FolderKanban, note: `${projects.length} projetos cadastrados` },
    { label: "Conversão", value: `${conversion}%`, icon: Target, note: `${closed} negócios fechados` },
  ];

  return (
    <>
      <PageHeader eyebrow="Visão geral" title={`Bom trabalho, ${profile?.name?.split(" ")[0] || "equipe"}.`} description="Aqui está o resumo atualizado da operação comercial da LYNK." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {loading ? Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-32" />) : cards.map(({ label, value, icon: Icon, note }) => (
          <Card key={label} className="group overflow-hidden"><CardContent className="relative p-5"><div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-primary/5 blur-2xl transition group-hover:bg-primary/15" /><div className="flex items-center justify-between"><p className="text-xs text-muted">{label}</p><Icon className="h-4 w-4 text-primary-light" /></div><p className="mt-4 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{note}</p></CardContent></Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <Card><CardHeader><div><CardTitle>Evolução semanal</CardTitle><CardDescription>Novos leads nas últimas sete semanas</CardDescription></div><Badge tone="blue">Atualizado</Badge></CardHeader><CardContent><WeeklyEvolutionChart data={weeklyLeadData(leads)} /></CardContent></Card>
        <Card><CardHeader><div><CardTitle>Funil comercial</CardTitle><CardDescription>Avanço acumulado por etapa</CardDescription></div></CardHeader><CardContent><FunnelCommercialChart data={funnelData(leads)} /></CardContent></Card>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.8fr]">
        <Card><CardHeader><div><CardTitle>Desempenho por usuário</CardTitle><CardDescription>Leads sob responsabilidade e fechamentos</CardDescription></div></CardHeader><CardContent><UserPerformanceChart data={performanceData(leads, membersQuery.data || [])} /></CardContent></Card>
        <Card><CardHeader><div><CardTitle>Próximas atividades</CardTitle><CardDescription>Tarefas pendentes da equipe</CardDescription></div><Link href="/agenda" className="flex items-center gap-1 text-xs text-primary-light hover:underline">Ver agenda <ArrowUpRight className="h-3 w-3" /></Link></CardHeader><CardContent className="space-y-2.5">
          {upcoming.length ? upcoming.map((task) => <div key={task.id} className="flex items-center gap-3 rounded-xl border border-line bg-[#090909] p-3"><div className="rounded-lg bg-primary/10 p-2 text-primary-light"><CalendarClock className="h-4 w-4" /></div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-zinc-200">{task.title}</p><p className="mt-1 truncate text-[10px] text-zinc-600">{task.lead?.company_name || "Tarefa interna"}</p></div><span className="text-[10px] text-zinc-500">{formatDate(task.scheduled_at, true)}</span></div>) : <div className="flex h-48 items-center justify-center text-sm text-zinc-600">Nenhuma atividade pendente.</div>}
        </CardContent></Card>
      </div>
    </>
  );
}
