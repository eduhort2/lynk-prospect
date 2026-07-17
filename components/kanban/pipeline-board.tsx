"use client";

import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, GripVertical, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { LEAD_STATUSES, type Lead, type LeadStatus } from "@/types";

const columnAccent: Record<LeadStatus, string> = {
  Novo: "bg-blue-400",
  "Contato enviado": "bg-violet-400",
  Respondeu: "bg-cyan-400",
  "Reunião marcada": "bg-fuchsia-400",
  "Proposta enviada": "bg-indigo-400",
  Negociação: "bg-amber-400",
  Fechado: "bg-emerald-400",
  Perdido: "bg-red-400",
};

function LeadCard({ lead, overlay = false }: { lead: Lead; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id, data: { lead } });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <article
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("cursor-grab rounded-xl border border-line bg-[#111] p-3.5 shadow-lg transition hover:border-white/15 active:cursor-grabbing", (isDragging && !overlay) && "opacity-20", overlay && "w-72 rotate-2 border-primary/30 shadow-glow")}
    >
      <div className="flex items-start justify-between gap-2"><div><h4 className="text-sm font-medium text-zinc-100">{lead.company_name}</h4><p className="mt-1 text-[11px] text-zinc-600">{lead.segment || "Sem segmento"}</p></div><GripVertical className="h-4 w-4 shrink-0 text-zinc-700" /></div>
      <div className="mt-3 flex items-center gap-2"><Badge tone={lead.priority === "Alta" ? "red" : lead.priority === "Média" ? "amber" : "gray"}>{lead.priority}</Badge>{lead.city ? <span className="truncate text-[11px] text-zinc-600">{lead.city}</span> : null}</div>
      <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[10px] text-zinc-600"><span className="flex items-center gap-1"><CalendarClock className="h-3 w-3" /> {formatDate(lead.updated_at)}</span>{lead.whatsapp ? <MessageCircle className="h-3.5 w-3.5 text-zinc-500" /> : null}</div>
    </article>
  );
}

function Column({ status, leads }: { status: LeadStatus; leads: Lead[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} className={cn("flex w-72 shrink-0 flex-col rounded-2xl border border-line bg-[#090909]/80 transition", isOver && "border-primary/45 bg-primary/[.04]")}>
      <header className="flex items-center gap-2 border-b border-line p-3.5"><span className={cn("h-2 w-2 rounded-full", columnAccent[status])} /><h3 className="text-xs font-medium text-zinc-300">{status}</h3><span className="ml-auto rounded-full bg-white/[.05] px-2 py-0.5 text-[10px] text-zinc-500">{leads.length}</span></header>
      <div className="min-h-32 flex-1 space-y-2.5 p-2.5">
        {leads.map((lead) => <LeadCard key={lead.id} lead={lead} />)}
        {!leads.length ? <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-line text-[11px] text-zinc-700">Arraste um lead para cá</div> : null}
      </div>
    </section>
  );
}

export function PipelineBoard({ leads, onStatusChange }: { leads: Lead[]; onStatusChange: (lead: Lead, status: LeadStatus) => Promise<void> }) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function onDragStart(event: DragStartEvent) {
    setActiveLead(event.active.data.current?.lead as Lead);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    if (!event.over) return;
    const lead = event.active.data.current?.lead as Lead;
    const overId = String(event.over.id);
    const targetStatus = LEAD_STATUSES.includes(overId as LeadStatus)
      ? (overId as LeadStatus)
      : leads.find((item) => item.id === overId)?.status;
    if (targetStatus && targetStatus !== lead.status) await onStatusChange(lead, targetStatus);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragCancel={() => setActiveLead(null)}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STATUSES.map((status) => <Column key={status} status={status} leads={leads.filter((lead) => lead.status === status)} />)}
      </div>
      <DragOverlay>{activeLead ? <LeadCard lead={activeLead} overlay /> : null}</DragOverlay>
    </DndContext>
  );
}
