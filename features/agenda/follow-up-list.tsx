"use client";

import { addDays, format, setHours, setMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CalendarClock, CalendarPlus, Check, ChevronRight, Sun } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { followUpBucket, useScheduleFollowUp, type FollowUpBucket } from "@/features/leads/follow-ups";
import { stageInfo, stageLabel } from "@/features/leads/stages";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const GROUPS: Array<{ key: FollowUpBucket; title: string; empty: string; icon: typeof AlertCircle; tone: string }> = [
  { key: "overdue", title: "Atrasados", empty: "Nenhum retorno atrasado.", icon: AlertCircle, tone: "text-red-300" },
  { key: "today", title: "Hoje", empty: "Nenhum retorno para hoje.", icon: Sun, tone: "text-amber-300" },
  { key: "upcoming", title: "Próximos", empty: "Nenhum retorno agendado.", icon: CalendarClock, tone: "text-primary-light" },
];

function when(task: Task, bucket: FollowUpBucket) {
  const date = new Date(task.scheduled_at);
  if (bucket === "today") return `Hoje, ${format(date, "HH:mm")}`;
  return format(date, "EEE, dd MMM · HH:mm", { locale: ptBR });
}

/** Retornos pendentes dos leads, agrupados em atrasados, hoje e próximos. */
export function FollowUpList({ tasks }: { tasks: Task[] }) {
  const actions = useScheduleFollowUp();
  const pending = tasks
    .filter((task) => task.status === "pendente")
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const grouped = Object.fromEntries(GROUPS.map((group) => [group.key, [] as Task[]])) as Record<FollowUpBucket, Task[]>;
  for (const task of pending) grouped[followUpBucket(task.scheduled_at)].push(task);

  async function complete(task: Task) {
    try { await actions.complete(task); toast.success("Retorno concluído"); }
    catch (error) { toast.error("Não foi possível concluir", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  async function postpone(task: Task) {
    const next = setMinutes(setHours(addDays(new Date(), 1), new Date(task.scheduled_at).getHours() || 9), new Date(task.scheduled_at).getMinutes());
    try {
      await actions.schedule(task.lead || { id: task.lead_id || "", company_name: task.title }, task, format(next, "yyyy-MM-dd'T'HH:mm"));
      toast.success("Retorno adiado para amanhã");
    } catch (error) { toast.error("Não foi possível reagendar", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-3">
      {GROUPS.map((group) => {
        const Icon = group.icon;
        const items = grouped[group.key];
        return (
          <Card key={group.key} className="flex flex-col">
            <header className="flex items-center gap-2 border-b border-line px-4 py-3">
              <Icon className={cn("h-4 w-4", group.tone)} />
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <span className="ml-auto rounded-full bg-white/[.05] px-2 py-0.5 text-[11px] text-zinc-500">{items.length}</span>
            </header>
            <ul className="max-h-96 flex-1 divide-y divide-line overflow-y-auto">
              {items.length ? items.map((task) => {
                const lead = task.lead;
                return (
                  <li key={task.id} className="flex items-center gap-2 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      {lead ? (
                        <Link href={`/leads?lead=${lead.id}`} className="group flex items-center gap-1 text-sm font-medium text-zinc-100 hover:text-white">
                          <span className="truncate">{lead.company_name}</span><ChevronRight className="h-3.5 w-3.5 shrink-0 text-zinc-600 group-hover:text-primary-light" />
                        </Link>
                      ) : <p className="truncate text-sm font-medium text-zinc-300">{task.title}</p>}
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                        <span className={group.key === "overdue" ? "text-red-300" : undefined}>{when(task, group.key)}</span>
                        {lead?.status ? <Badge tone={stageInfo(lead.status).tone} className="px-2 py-0.5 text-[10px]">{stageLabel(lead.status)}</Badge> : null}
                        {lead?.suggested_service ? <span>{lead.suggested_service}</span> : null}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => postpone(task)} aria-label="Adiar para amanhã" title="Adiar para amanhã" disabled={actions.isPending}><CalendarPlus className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-emerald-300" onClick={() => complete(task)} aria-label="Concluir retorno" title="Concluir" disabled={actions.isPending}><Check className="h-4 w-4" /></Button>
                  </li>
                );
              }) : <li className="px-4 py-6 text-center text-xs text-zinc-600">{group.empty}</li>}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}
