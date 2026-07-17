"use client";

import { Download, MessageCircleReply, Target, TrendingUp, UsersRound } from "lucide-react";
import { FunnelCommercialChart, UserPerformanceChart, WeeklyEvolutionChart } from "@/components/charts/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useMembers } from "@/features/auth/use-members";
import { useLeads } from "@/features/leads/use-leads";
import { LEAD_STATUSES } from "@/types";
import { funnelData, performanceData, weeklyLeadData } from "./report-utils";

function csvCell(value: unknown) { return `"${String(value ?? "").replace(/"/g, '""')}"`; }

export function ReportsPage() {
  const leadsQuery = useLeads();
  const membersQuery = useMembers();
  const leads = leadsQuery.data || [];
  const closed = leads.filter((lead) => lead.status === "Fechado").length;
  const answered = leads.filter((lead) => ["Respondeu", "Reunião marcada", "Proposta enviada", "Negociação", "Fechado"].includes(lead.status)).length;
  const conversion = leads.length ? (closed / leads.length) * 100 : 0;
  const responseRate = leads.length ? (answered / leads.length) * 100 : 0;
  const highPriority = leads.filter((lead) => lead.priority === "Alta" && !["Fechado", "Perdido"].includes(lead.status)).length;

  function exportCsv() {
    const headers = ["Empresa", "Contato", "WhatsApp", "Email", "Segmento", "Cidade", "UF", "Origem", "Prioridade", "Status", "Responsável", "Criado em", "Atualizado em"];
    const rows = leads.map((lead) => [lead.company_name, lead.contact_name, lead.whatsapp, lead.email, lead.segment, lead.city, lead.state, lead.source, lead.priority, lead.status, lead.responsible?.name, lead.created_at, lead.updated_at]);
    const content = `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(";")).join("\n")}`;
    const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `relatorio-leads-lynk-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
    URL.revokeObjectURL(url);
  }

  const sourceData = Object.entries(leads.reduce<Record<string, number>>((acc, lead) => { const key = lead.source || "Não informada"; acc[key] = (acc[key] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxSource = Math.max(...sourceData.map(([, count]) => count), 1);

  return (
    <>
      <PageHeader eyebrow="Inteligência comercial" title="Relatórios" description="Indicadores básicos para acompanhar volume, resposta e conversão da prospecção." actions={<Button variant="secondary" onClick={exportCsv} disabled={!leads.length}><Download className="h-4 w-4" /> Exportar CSV</Button>} />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[{ label: "Leads cadastrados", value: leads.length, icon: UsersRound, note: "Base total" }, { label: "Taxa de resposta", value: `${responseRate.toFixed(1).replace(".", ",")}%`, icon: MessageCircleReply, note: `${answered} oportunidades responderam` }, { label: "Conversão", value: `${conversion.toFixed(1).replace(".", ",")}%`, icon: Target, note: `${closed} negócios fechados` }, { label: "Alta prioridade", value: highPriority, icon: TrendingUp, note: "Oportunidades em aberto" }].map(({ label, value, icon: Icon, note }) => <Card key={label}><CardContent className="p-5"><div className="flex items-center justify-between text-xs text-muted"><span>{label}</span><Icon className="h-4 w-4 text-primary-light" /></div><p className="mt-4 text-2xl font-semibold">{value}</p><p className="mt-1 text-[10px] text-zinc-600">{note}</p></CardContent></Card>)}
      </div>
      <div className="mt-5 grid gap-5 xl:grid-cols-2"><Card><CardHeader><div><CardTitle>Evolução de entrada</CardTitle><CardDescription>Leads cadastrados por semana</CardDescription></div></CardHeader><CardContent><WeeklyEvolutionChart data={weeklyLeadData(leads, 8)} /></CardContent></Card><Card><CardHeader><div><CardTitle>Funil acumulado</CardTitle><CardDescription>Retenção das oportunidades ao longo do processo</CardDescription></div></CardHeader><CardContent><FunnelCommercialChart data={funnelData(leads)} /></CardContent></Card></div>
      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_.8fr]"><Card><CardHeader><div><CardTitle>Desempenho da equipe</CardTitle><CardDescription>Distribuição de leads e fechamentos</CardDescription></div></CardHeader><CardContent><UserPerformanceChart data={performanceData(leads, membersQuery.data || [])} /></CardContent></Card><Card><CardHeader><div><CardTitle>Origem dos leads</CardTitle><CardDescription>Canais com maior volume cadastrado</CardDescription></div></CardHeader><CardContent className="space-y-4">{sourceData.length ? sourceData.map(([source, count]) => <div key={source}><div className="mb-1.5 flex justify-between text-xs"><span className="text-zinc-400">{source}</span><span className="text-zinc-600">{count}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-white/[.05]"><div className="h-full rounded-full bg-primary" style={{ width: `${(count / maxSource) * 100}%` }} /></div></div>) : <div className="flex h-56 items-center justify-center text-sm text-zinc-600">Sem dados de origem.</div>}</CardContent></Card></div>
      <Card className="mt-5"><CardHeader><div><CardTitle>Distribuição por etapa</CardTitle><CardDescription>Quantidade atual em cada status do pipeline</CardDescription></div></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{LEAD_STATUSES.map((status) => { const count = leads.filter((lead) => lead.status === status).length; return <div key={status} className="flex items-center justify-between rounded-xl border border-line bg-[#090909] p-3 text-xs"><span className="text-zinc-400">{status}</span><span className="font-semibold text-white">{count}</span></div>; })}</div></CardContent></Card>
    </>
  );
}
