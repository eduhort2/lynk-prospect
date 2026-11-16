"use client";

import { CalendarClock, CircleDollarSign, MessagesSquare, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PipelineBoard, type PipelineColumnData } from "@/components/kanban/pipeline-board";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { PageSizeSelect } from "@/components/ui/pagination";
import { followUpBucket, useFollowUps } from "@/features/leads/follow-ups";
import { PIPELINE_STAGES, stageLabel, type StageStatus } from "@/features/leads/stages";
import { usePageSize, usePipelineColumn } from "@/features/leads/use-lead-pages";
import { useUpdateLead } from "@/features/leads/use-leads";
import type { Lead, LeadStatus } from "@/types";

type Limits = Record<StageStatus, number>;
const limitsFor = (size: number) => Object.fromEntries(PIPELINE_STAGES.map((stage) => [stage.status, size])) as Limits;

export function PipelinePage() {
  const followUps = useFollowUps();
  const update = useUpdateLead();
  const [pageSize, setPageSize] = usePageSize();
  const [limits, setLimits] = useState<Limits>(() => limitsFor(pageSize));
  useEffect(() => { setLimits(limitsFor(pageSize)); }, [pageSize]);

  // Uma consulta por coluna (lista fixa de 6 etapas): cada uma traz só os primeiros N cards.
  const queries = {
    Novo: usePipelineColumn("Novo", limits.Novo),
    "Contato enviado": usePipelineColumn("Contato enviado", limits["Contato enviado"]),
    Respondeu: usePipelineColumn("Respondeu", limits.Respondeu),
    "Proposta enviada": usePipelineColumn("Proposta enviada", limits["Proposta enviada"]),
    Fechado: usePipelineColumn("Fechado", limits.Fechado),
    Perdido: usePipelineColumn("Perdido", limits.Perdido),
  } satisfies Record<StageStatus, ReturnType<typeof usePipelineColumn>>;

  const columns = Object.fromEntries(PIPELINE_STAGES.map(({ status }) => {
    const query = queries[status];
    return [status, { rows: query.data?.rows || [], total: query.data?.total ?? 0, loading: query.isFetching }];
  })) as Record<StageStatus, PipelineColumnData>;

  const isLoading = Object.values(queries).some((query) => query.isPending);
  const error = Object.values(queries).find((query) => query.isError)?.error;
  const totalOf = (...stages: StageStatus[]) => stages.reduce((sum, stage) => sum + columns[stage].total, 0);

  const stats = [
    { label: "Em aberto", value: totalOf("Novo", "Contato enviado", "Respondeu", "Proposta enviada"), icon: MessagesSquare },
    { label: "Propostas enviadas", value: totalOf("Proposta enviada"), icon: CircleDollarSign },
    { label: "Retornos atrasados", value: [...followUps.byLead.values()].filter((task) => followUpBucket(task.scheduled_at) === "overdue").length, icon: CalendarClock },
    { label: "Fechados", value: totalOf("Fechado"), icon: Sparkles },
  ];

  async function changeStatus(lead: Lead, status: LeadStatus) {
    if (status === lead.status) return;
    try {
      await update.mutateAsync({ id: lead.id, values: { status }, previousStatus: lead.status });
      toast.success(`${lead.company_name} → ${stageLabel(status)}`);
    } catch (err) {
      toast.error("Não foi possível mover o lead", { description: err instanceof Error ? err.message : "Tente novamente." });
    }
  }

  function loadMore(stage: StageStatus) {
    setLimits((current) => ({ ...current, [stage]: current[stage] + pageSize }));
  }

  return (
    <>
      <PageHeader
        eyebrow="Negociações"
        title="Pipeline"
        description="Arraste o card ou troque a etapa no próprio card. Clique no nome para abrir a ficha."
        actions={<PageSizeSelect value={pageSize} onChange={setPageSize} label="Cards por coluna" />}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => <Card key={label}><CardContent className="flex items-center gap-3 p-4"><div className="rounded-xl bg-primary/10 p-2.5 text-primary-light"><Icon className="h-4 w-4" /></div><div><p className="text-xl font-semibold text-white">{value}</p><p className="text-xs text-muted">{label}</p></div></CardContent></Card>)}
      </div>
      {isLoading ? <Card className="flex min-h-80 items-center justify-center text-sm text-muted">Carregando pipeline...</Card> : error ? <Card className="flex min-h-80 items-center justify-center text-sm text-red-300">{error.message}</Card> : <PipelineBoard columns={columns} followUps={followUps.byLead} onStatusChange={changeStatus} onLoadMore={loadMore} />}
    </>
  );
}
