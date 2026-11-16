"use client";

import { CalendarClock, CircleDollarSign, MessagesSquare, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PipelineBoard } from "@/components/kanban/pipeline-board";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { followUpBucket, useFollowUps } from "@/features/leads/follow-ups";
import { isOpenStage, stageLabel, stageOf } from "@/features/leads/stages";
import { useLeads, useUpdateLead } from "@/features/leads/use-leads";
import type { Lead, LeadStatus } from "@/types";

export function PipelinePage() {
  const leads = useLeads();
  const followUps = useFollowUps();
  const update = useUpdateLead();
  const items = leads.data || [];
  const stats = [
    { label: "Em aberto", value: items.filter((lead) => isOpenStage(lead.status)).length, icon: MessagesSquare },
    { label: "Propostas enviadas", value: items.filter((lead) => stageOf(lead.status) === "Proposta enviada").length, icon: CircleDollarSign },
    { label: "Retornos atrasados", value: [...followUps.byLead.values()].filter((task) => followUpBucket(task.scheduled_at) === "overdue").length, icon: CalendarClock },
    { label: "Fechados", value: items.filter((lead) => lead.status === "Fechado").length, icon: Sparkles },
  ];

  async function changeStatus(lead: Lead, status: LeadStatus) {
    if (status === lead.status) return;
    try {
      await update.mutateAsync({ id: lead.id, values: { status }, previousStatus: lead.status });
      toast.success(`${lead.company_name} → ${stageLabel(status)}`);
    } catch (error) {
      toast.error("Não foi possível mover o lead", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Negociações" title="Pipeline" description="Arraste o card ou troque a etapa no próprio card. Clique no nome para abrir a ficha." />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2.5 text-primary-light"><Icon className="h-4 w-4" /></div><div><p className="text-xl font-semibold text-white">{value}</p><p className="text-xs text-muted">{label}</p></div></CardContent></Card>)}
      </div>
      {leads.isLoading ? <Card className="flex min-h-80 items-center justify-center text-sm text-muted">Carregando pipeline...</Card> : leads.isError ? <Card className="flex min-h-80 items-center justify-center text-sm text-red-300">{leads.error.message}</Card> : <PipelineBoard leads={items} followUps={followUps.byLead} onStatusChange={changeStatus} />}
    </>
  );
}
