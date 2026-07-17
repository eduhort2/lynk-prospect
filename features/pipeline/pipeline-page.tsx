"use client";

import { Building2, CircleDollarSign, MessageCircleReply, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PipelineBoard } from "@/components/kanban/pipeline-board";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { useLeads, useUpdateLead } from "@/features/leads/use-leads";
import type { Lead, LeadStatus } from "@/types";

export function PipelinePage() {
  const leads = useLeads();
  const update = useUpdateLead();
  const items = leads.data || [];
  const stats = [
    { label: "Em aberto", value: items.filter((lead) => !["Fechado", "Perdido"].includes(lead.status)).length, icon: Building2 },
    { label: "Responderam", value: items.filter((lead) => ["Respondeu", "Reunião marcada", "Proposta enviada", "Negociação", "Fechado"].includes(lead.status)).length, icon: MessageCircleReply },
    { label: "Em negociação", value: items.filter((lead) => ["Proposta enviada", "Negociação"].includes(lead.status)).length, icon: CircleDollarSign },
    { label: "Fechados", value: items.filter((lead) => lead.status === "Fechado").length, icon: Sparkles },
  ];

  async function changeStatus(lead: Lead, status: LeadStatus) {
    try {
      await update.mutateAsync({ id: lead.id, values: { status }, previousStatus: lead.status });
      toast.success(`${lead.company_name} movido para ${status}`);
    } catch (error) {
      toast.error("Não foi possível mover o lead", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  return (
    <>
      <PageHeader eyebrow="Fluxo comercial" title="Pipeline" description="Arraste os cards entre as etapas. A mudança é salva automaticamente e registrada no histórico." />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-4 p-4"><div className="rounded-xl bg-primary/10 p-2.5 text-primary-light"><Icon className="h-4 w-4" /></div><div><p className="text-xl font-semibold text-white">{value}</p><p className="text-xs text-muted">{label}</p></div></CardContent></Card>)}
      </div>
      {leads.isLoading ? <Card className="flex min-h-80 items-center justify-center text-sm text-muted">Carregando pipeline...</Card> : leads.isError ? <Card className="flex min-h-80 items-center justify-center text-sm text-red-300">{leads.error.message}</Card> : <PipelineBoard leads={items} onStatusChange={changeStatus} />}
    </>
  );
}
