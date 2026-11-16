"use client";

import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarClock, GripVertical, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { followUpBucket } from "@/features/leads/follow-ups";
import { StageOptions } from "@/features/leads/stage-options";
import { isLegacyStatus, PIPELINE_STAGES, stageOf, type StageStatus } from "@/features/leads/stages";
import { hasWhatsApp } from "@/features/leads/whatsapp-link";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, Task } from "@/types";

type BoardProps = {
  leads: Lead[];
  followUps: Map<string, Task>;
  onStatusChange: (lead: Lead, status: LeadStatus) => Promise<void>;
};

function LeadCard({ lead, followUp, onStatusChange, overlay = false }: { lead: Lead; followUp?: Task; onStatusChange?: BoardProps["onStatusChange"]; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  const bucket = followUp ? followUpBucket(followUp.scheduled_at) : null;
  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn("rounded-xl border border-line bg-[#111] p-3.5 shadow-lg transition hover:border-white/15", (isDragging && !overlay) && "opacity-20", overlay && "w-72 rotate-2 border-primary/30 shadow-glow")}
    >
      <div className="flex items-start justify-between gap-2">
        <Link href={`/leads?lead=${lead.id}`} className="min-w-0 hover:underline">
          <h4 className="truncate text-sm font-medium text-zinc-100">{lead.company_name}</h4>
          <p className="mt-1 truncate text-[11px] text-zinc-600">{[lead.city, lead.state].filter(Boolean).join("/") || lead.segment || "Sem cidade"}</p>
        </Link>
        <button type="button" {...listeners} {...attributes} className="-m-1 cursor-grab touch-none rounded p-1 text-zinc-700 hover:text-zinc-400 active:cursor-grabbing" aria-label={`Arrastar ${lead.company_name}`}><GripVertical className="h-4 w-4" /></button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {lead.suggested_service ? <Badge tone="gray" className="px-2 py-0.5 text-[10px]">{lead.suggested_service}</Badge> : null}
        {isLegacyStatus(lead.status) ? <span className="text-[10px] text-zinc-600">{lead.status}</span> : null}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[10px] text-zinc-600">
        <span className={cn("flex items-center gap-1", bucket === "overdue" && "text-red-300", bucket === "today" && "text-amber-300")}><CalendarClock className="h-3 w-3" /> {followUp ? formatDate(followUp.scheduled_at) : "Sem retorno"}</span>
        {hasWhatsApp(lead) ? <MessageCircle className="h-3.5 w-3.5 text-primary-light" aria-label="WhatsApp disponível" /> : null}
      </div>
      {onStatusChange ? (
        <select
          aria-label={`Etapa de ${lead.company_name}`}
          value={lead.status}
          onChange={(event) => onStatusChange(lead, event.target.value as LeadStatus)}
          className="mt-2.5 h-8 w-full rounded-md border border-line bg-[#0D0E0C] px-2 text-[11px] text-zinc-300 outline-none focus:border-primary/60"
        >
          <StageOptions current={lead.status} />
        </select>
      ) : null}
    </article>
  );
}

function Column({ status, label, accent, leads, followUps, onStatusChange }: { status: StageStatus; label: string; accent: string; leads: Lead[] } & Omit<BoardProps, "leads">) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={cn("flex w-[min(18rem,82vw)] shrink-0 snap-start flex-col rounded-2xl border border-line bg-[#090909]/80 transition", isOver && "border-primary/45 bg-primary/[.04]")}>
      <header className="flex items-center gap-2 border-b border-line p-3.5"><span className={cn("h-2 w-2 rounded-full", accent)} /><h3 className="text-xs font-medium text-zinc-300">{label}</h3><span className="ml-auto rounded-full bg-white/[.05] px-2 py-0.5 text-[10px] text-zinc-500">{leads.length}</span></header>
      <div className="min-h-32 flex-1 space-y-2.5 p-2.5">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} followUp={followUps.get(lead.id)} onStatusChange={onStatusChange} />)}
        {!leads.length ? <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-line text-[11px] text-zinc-700">Arraste um lead para cá</div> : null}
      </div>
    </section>
  );
}

export function PipelineBoard({ leads, followUps, onStatusChange }: BoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragStart(event: DragStartEvent) {
    setActiveLead(event.active.data.current?.lead as Lead);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    if (!event.over) return;
    const lead = event.active.data.current?.lead as Lead;
    const target = PIPELINE_STAGES.find((stage) => stage.status === String(event.over!.id))?.status;
    // Soltar na mesma coluna não altera nada (preserva etapas antigas como "Reunião marcada").
    if (target && target !== stageOf(lead.status)) await onStatusChange(lead, target);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveLead(null)}>
      <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
        {PIPELINE_STAGES.map((stage) => <Column key={stage.status} status={stage.status} label={stage.label} accent={stage.accent} leads={leads.filter((lead) => stageOf(lead.status) === stage.status)} followUps={followUps} onStatusChange={onStatusChange} />)}
      </div>
      <DragOverlay>{activeLead ? <LeadCard lead={activeLead} followUp={followUps.get(activeLead.id)} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
