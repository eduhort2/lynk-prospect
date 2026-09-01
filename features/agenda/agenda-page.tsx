"use client";

import { useQuery } from "@tanstack/react-query";
import { addDays, addHours, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck2, CalendarDays, Check, ChevronLeft, ChevronRight, CircleX, Clock3, ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TaskForm } from "@/components/forms/task-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { useMembers } from "@/features/auth/use-members";
import { useOrganization } from "@/features/auth/organization-provider";
import { useLeads } from "@/features/leads/use-leads";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { TaskFormValues } from "@/lib/validations/task";
import type { Task } from "@/types";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "./use-tasks";

type View = "month" | "week" | "day";
type GoogleStatus = { connected: boolean; email?: string | null; error?: string };
type GoogleEvent = {
  id: string;
  summary?: string;
  description?: string;
  htmlLink?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
};

const statusTone = { pendente: "blue", "concluído": "green", cancelado: "red" } as const;

function googleEventDate(event: GoogleEvent) {
  const value = event.start.dateTime || (event.start.date ? `${event.start.date}T00:00:00` : "");
  return value ? new Date(value) : null;
}

function TaskChip({ task, onComplete, onCancel, onDelete }: { task: Task; onComplete: () => void; onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="group rounded-xl border border-line bg-surface/55 p-3">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className={cn("truncate text-xs font-medium text-zinc-200", task.status !== "pendente" && "line-through opacity-60")}>{task.title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted"><Clock3 className="h-3 w-3" />{format(new Date(task.scheduled_at), "HH:mm")} {task.lead ? `· ${task.lead.company_name}` : ""}</p></div><Badge tone={statusTone[task.status]} className="shrink-0 px-1.5 py-0.5 text-[9px]">{task.status}</Badge></div>
      <div className="mt-2 flex items-center justify-end gap-1 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
        {task.status === "pendente" ? <><Button variant="ghost" size="sm" className="h-7 px-2" onClick={onComplete}><Check className="h-3 w-3" /> Concluir</Button><Button variant="ghost" size="icon" className="h-7 w-7 text-amber-300" onClick={onCancel} aria-label="Cancelar tarefa"><CircleX className="h-3.5 w-3.5" /></Button></> : null}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-300" onClick={onDelete} aria-label="Excluir tarefa"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

function GoogleEventChip({ event }: { event: GoogleEvent }) {
  const date = googleEventDate(event);
  return (
    <button type="button" onClick={() => event.htmlLink && window.open(event.htmlLink, "_blank", "noopener,noreferrer")} className="w-full rounded-xl border border-accent/20 bg-accent/[.045] p-3 text-left transition hover:border-accent/35 hover:bg-accent/[.07]">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent"><CalendarDays className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-xs font-medium text-zinc-200">{event.summary || "Evento do Google"}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-muted">{date ? format(date, "HH:mm") : "Dia inteiro"} · Google Agenda</p></div>
        {event.htmlLink ? <ExternalLink className="h-3.5 w-3.5 text-muted" /> : null}
      </div>
    </button>
  );
}

export function AgendaPage() {
  const { userId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const tasksQuery = useTasks();
  const leadsQuery = useLeads();
  const membersQuery = useMembers();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(new Date());
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const tasks = tasksQuery.data || [];

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const result: Date[] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) result.push(day);
    return result;
  }, [cursor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor, { weekStartsOn: 0 }), index)), [cursor]);

  const googleStatusQuery = useQuery<GoogleStatus>({
    queryKey: ["google-calendar-status", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const response = await fetch("/api/google-calendar/status", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) return { connected: false, error: payload.error };
      return payload;
    },
    staleTime: 60_000,
  });

  const googleRange = useMemo(() => {
    if (view === "month") {
      const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
      return { timeMin: start.toISOString(), timeMax: addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }), 1).toISOString() };
    }
    if (view === "week") {
      const start = startOfWeek(cursor, { weekStartsOn: 0 });
      return { timeMin: start.toISOString(), timeMax: addDays(start, 7).toISOString() };
    }
    const start = startOfDay(cursor);
    return { timeMin: start.toISOString(), timeMax: addDays(start, 1).toISOString() };
  }, [cursor, view]);

  const googleEventsQuery = useQuery<{ events: GoogleEvent[] }>({
    queryKey: ["google-calendar-events", userId, googleRange.timeMin, googleRange.timeMax],
    enabled: Boolean(userId && googleStatusQuery.data?.connected),
    queryFn: async () => {
      const params = new URLSearchParams(googleRange);
      const response = await fetch(`/api/google-calendar/events?${params.toString()}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Não foi possível carregar o Google Agenda");
      return payload;
    },
    staleTime: 30_000,
  });

  const googleEvents = googleEventsQuery.data?.events || [];
  function tasksFor(date: Date) { return tasks.filter((task) => isSameDay(new Date(task.scheduled_at), date)); }
  function googleEventsFor(date: Date) { return googleEvents.filter((event) => { const start = googleEventDate(event); return start ? isSameDay(start, date) : false; }); }
  function previous() { setCursor((date) => view === "month" ? subMonths(date, 1) : view === "week" ? subWeeks(date, 1) : subDays(date, 1)); }
  function next() { setCursor((date) => view === "month" ? addMonths(date, 1) : view === "week" ? addWeeks(date, 1) : addDays(date, 1)); }
  function openAt(date = new Date()) { const initial = new Date(date); if (initial.getHours() === 0) initial.setHours(9); setSelectedDate(initial); setFormOpen(true); }

  async function connectGoogle() {
    setConnectingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/agenda`,
          scopes: "https://www.googleapis.com/auth/calendar.events",
          queryParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
        },
      });
      if (error) throw error;
    } catch (error) {
      setConnectingGoogle(false);
      toast.error("Não foi possível conectar o Google Agenda", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function submit(values: TaskFormValues) {
    try {
      await createTask.mutateAsync(values);
      let synced = false;
      if (googleStatusQuery.data?.connected) {
        try {
          const start = new Date(values.scheduled_at);
          const response = await fetch("/api/google-calendar/events", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              summary: values.title,
              description: values.description || "Criado pelo LYNK Hub",
              start: start.toISOString(),
              end: addHours(start, 1).toISOString(),
            }),
          });
          if (!response.ok) {
            const payload = await response.json();
            throw new Error(payload.error || "Falha ao criar evento no Google");
          }
          synced = true;
          await googleEventsQuery.refetch();
        } catch (calendarError) {
          toast.warning("Tarefa criada no Hub, mas não sincronizada com o Google", { description: calendarError instanceof Error ? calendarError.message : "Reconecte o Google Agenda." });
        }
      }
      if (synced) toast.success("Tarefa criada e adicionada ao Google Agenda");
      else if (!googleStatusQuery.data?.connected) toast.success("Tarefa criada");
      setFormOpen(false);
    } catch (error) { toast.error("Não foi possível criar a tarefa", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  async function setStatus(task: Task, status: "concluído" | "cancelado") {
    try { await updateTask.mutateAsync({ id: task.id, values: { status } }); toast.success(status === "concluído" ? "Tarefa concluída" : "Tarefa cancelada"); }
    catch (error) { toast.error("Não foi possível atualizar", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteTask.mutateAsync(deleteTarget.id); toast.success("Tarefa excluída"); setDeleteTarget(null); }
    catch (error) { toast.error("Não foi possível excluir", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  const taskActions = (task: Task) => ({ onComplete: () => setStatus(task, "concluído"), onCancel: () => setStatus(task, "cancelado"), onDelete: () => setDeleteTarget(task) });
  const title = view === "month" ? format(cursor, "MMMM 'de' yyyy", { locale: ptBR }) : view === "week" ? `${format(weekDays[0], "dd MMM", { locale: ptBR })} — ${format(weekDays[6], "dd MMM yyyy", { locale: ptBR })}` : format(cursor, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const googleConnected = Boolean(googleStatusQuery.data?.connected);

  return (
    <>
      <PageHeader eyebrow="Organização" title="Agenda" description="Tarefas do Hub e eventos do Google Calendar em uma única visão." actions={<><Button variant="secondary" onClick={googleConnected ? () => googleEventsQuery.refetch() : connectGoogle} disabled={connectingGoogle || googleStatusQuery.isLoading || googleEventsQuery.isFetching}>{googleConnected ? <RefreshCw className={cn("h-4 w-4", googleEventsQuery.isFetching && "animate-spin")} /> : <CalendarDays className="h-4 w-4" />}{googleConnected ? `Google conectado${googleStatusQuery.data?.email ? ` · ${googleStatusQuery.data.email}` : ""}` : connectingGoogle ? "Abrindo Google..." : "Conectar Google Agenda"}</Button><Button onClick={() => openAt(cursor)}><Plus className="h-4 w-4" /> Nova tarefa</Button></>} />

      {!googleConnected && !googleStatusQuery.isLoading ? <div className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/10 bg-primary/[.035] p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-zinc-200">Conecte seu Google Calendar</p><p className="mt-1 text-xs text-muted">Os eventos do Google aparecerão aqui e novas tarefas poderão ser adicionadas automaticamente à sua agenda.</p></div><Button variant="secondary" className="shrink-0" onClick={connectGoogle}><CalendarDays className="h-4 w-4" /> Conectar</Button></div> : null}

      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button><Button variant="ghost" size="icon" onClick={previous} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={next} aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Button><h2 className="ml-1 text-sm font-semibold capitalize text-white sm:ml-2">{title}</h2></div>
          <div className="flex rounded-xl border border-line bg-surface/60 p-1">{(["month", "week", "day"] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={cn("flex-1 rounded-lg px-3 py-1.5 text-xs transition sm:flex-none", view === item ? "bg-white/[.08] text-white" : "text-muted hover:text-zinc-300")}>{item === "month" ? "Mês" : item === "week" ? "Semana" : "Dia"}</button>)}</div>
        </div>

        {tasksQuery.isLoading ? <div className="flex min-h-[460px] items-center justify-center text-sm text-muted">Carregando agenda...</div> : view === "month" ? (
          <div className="overflow-x-auto"><div className="min-w-[760px]"><div className="grid grid-cols-7 border-b border-line bg-background/45">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <div key={day} className="p-2 text-center text-[10px] uppercase tracking-wider text-muted">{day}</div>)}</div><div className="grid grid-cols-7">{monthDays.map((day) => { const dayTasks = tasksFor(day); const dayGoogle = googleEventsFor(day); const total = dayTasks.length + dayGoogle.length; return <button key={day.toISOString()} onDoubleClick={() => openAt(day)} onClick={() => { setCursor(day); if (window.innerWidth < 640) setView("day"); }} className={cn("min-h-32 border-b border-r border-line p-2 text-left align-top transition hover:bg-white/[.018]", !isSameMonth(day, cursor) && "bg-black/20 opacity-35")}><span className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-xs text-muted", isSameDay(day, new Date()) && "bg-accent text-white")}>{format(day, "d")}</span><div className="mt-1.5 space-y-1">{dayTasks.slice(0, 2).map((task) => <div key={task.id} className={cn("truncate rounded-md border-l-2 bg-primary/[.04] px-1.5 py-1 text-[9px] text-zinc-400", task.status === "concluído" ? "border-emerald-400 opacity-55" : task.status === "cancelado" ? "border-red-400 opacity-55" : "border-primary")}>{format(new Date(task.scheduled_at), "HH:mm")} {task.title}</div>)}{dayGoogle.slice(0, Math.max(0, 3 - dayTasks.slice(0, 2).length)).map((event) => { const start = googleEventDate(event); return <div key={event.id} className="truncate rounded-md border-l-2 border-accent bg-accent/[.04] px-1.5 py-1 text-[9px] text-zinc-400">{event.start.date ? "Dia" : start ? format(start, "HH:mm") : ""} {event.summary || "Google"}</div>; })}{total > 3 ? <p className="pl-1 text-[9px] text-muted">+{total - 3} itens</p> : null}</div></button>; })}</div></div></div>
        ) : view === "week" ? (
          <div className="grid min-h-[500px] grid-cols-1 divide-y divide-line sm:grid-cols-7 sm:divide-x sm:divide-y-0">{weekDays.map((day) => <div key={day.toISOString()} className="min-w-0 p-3"><button onClick={() => { setCursor(day); setView("day"); }} className="mb-3 w-full text-center"><span className="text-[10px] uppercase text-muted">{format(day, "EEE", { locale: ptBR })}</span><span className={cn("mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-xl text-sm", isSameDay(day, new Date()) ? "bg-accent text-white" : "text-zinc-300")}>{format(day, "d")}</span></button><div className="space-y-2">{tasksFor(day).map((task) => <TaskChip key={task.id} task={task} {...taskActions(task)} />)}{googleEventsFor(day).map((event) => <GoogleEventChip key={event.id} event={event} />)}<Button variant="ghost" size="sm" className="w-full text-muted" onClick={() => openAt(day)}><Plus className="h-3 w-3" /> Adicionar</Button></div></div>)}</div>
        ) : (
          <div className="min-h-[460px] p-4 sm:p-6"><div className="mx-auto max-w-3xl space-y-3">{tasksFor(cursor).map((task) => <TaskChip key={task.id} task={task} {...taskActions(task)} />)}{googleEventsFor(cursor).map((event) => <GoogleEventChip key={event.id} event={event} />)}{!tasksFor(cursor).length && !googleEventsFor(cursor).length ? <EmptyState icon={CalendarCheck2} title="Dia livre" description="Não há tarefas nem eventos do Google para esta data." action={<Button onClick={() => openAt(startOfDay(cursor))}>Criar tarefa</Button>} /> : null}</div></div>
        )}
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Nova tarefa" description={googleConnected ? "A tarefa também será adicionada ao seu Google Calendar com duração padrão de 1 hora." : "Defina data, responsável e lead relacionado."}><TaskForm initialDate={selectedDate} leads={leadsQuery.data || []} members={membersQuery.data || []} currentUserId={userId || ""} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createTask.isPending} /></Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir tarefa" description="A tarefa será removida da agenda do Hub." size="md"><p className="text-sm text-zinc-400">Excluir <span className="font-medium text-white">{deleteTarget?.title}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteTask.isPending}>Excluir</Button></div></Dialog>
    </>
  );
}
