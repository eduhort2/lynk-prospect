"use client";

import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfDay, startOfMonth, startOfWeek, subDays, subMonths, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarCheck2, Check, ChevronLeft, ChevronRight, CircleX, Clock3, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { TaskFormValues } from "@/lib/validations/task";
import type { Task } from "@/types";
import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from "./use-tasks";

type View = "month" | "week" | "day";

const statusTone = { pendente: "blue", "concluído": "green", cancelado: "red" } as const;

function TaskChip({ task, onComplete, onCancel, onDelete }: { task: Task; onComplete: () => void; onCancel: () => void; onDelete: () => void }) {
  return (
    <div className="group rounded-lg border border-line bg-[#111] p-2.5">
      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className={cn("truncate text-xs font-medium text-zinc-200", task.status !== "pendente" && "line-through opacity-60")}>{task.title}</p><p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-600"><Clock3 className="h-3 w-3" />{format(new Date(task.scheduled_at), "HH:mm")} {task.lead ? `· ${task.lead.company_name}` : ""}</p></div><Badge tone={statusTone[task.status]} className="shrink-0 px-1.5 py-0.5 text-[9px]">{task.status}</Badge></div>
      <div className="mt-2 hidden items-center justify-end gap-1 group-hover:flex">
        {task.status === "pendente" ? <><Button variant="ghost" size="sm" className="h-7 px-2" onClick={onComplete}><Check className="h-3 w-3" /> Concluir</Button><Button variant="ghost" size="icon" className="h-7 w-7 text-amber-300" onClick={onCancel} aria-label="Cancelar tarefa"><CircleX className="h-3.5 w-3.5" /></Button></> : null}
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-300" onClick={onDelete} aria-label="Excluir tarefa"><Trash2 className="h-3.5 w-3.5" /></Button>
      </div>
    </div>
  );
}

export function AgendaPage() {
  const { userId } = useOrganization();
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
  const tasks = tasksQuery.data || [];

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    const result: Date[] = [];
    for (let day = start; day <= end; day = addDays(day, 1)) result.push(day);
    return result;
  }, [cursor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor, { weekStartsOn: 0 }), index)), [cursor]);

  function tasksFor(date: Date) { return tasks.filter((task) => isSameDay(new Date(task.scheduled_at), date)); }
  function previous() { setCursor((date) => view === "month" ? subMonths(date, 1) : view === "week" ? subWeeks(date, 1) : subDays(date, 1)); }
  function next() { setCursor((date) => view === "month" ? addMonths(date, 1) : view === "week" ? addWeeks(date, 1) : addDays(date, 1)); }
  function openAt(date = new Date()) { const initial = new Date(date); if (initial.getHours() === 0) initial.setHours(9); setSelectedDate(initial); setFormOpen(true); }

  async function submit(values: TaskFormValues) {
    try { await createTask.mutateAsync(values); toast.success("Tarefa criada"); setFormOpen(false); }
    catch (error) { toast.error("Não foi possível criar a tarefa", { description: error instanceof Error ? error.message : "Tente novamente." }); }
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

  return (
    <>
      <PageHeader eyebrow="Organização" title="Agenda" description="Acompanhe retornos, reuniões e atividades em visualização diária, semanal ou mensal." actions={<Button onClick={() => openAt(cursor)}><Plus className="h-4 w-4" /> Nova tarefa</Button>} />
      <Card className="overflow-hidden">
        <div className="flex flex-col justify-between gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2"><Button variant="secondary" size="sm" onClick={() => setCursor(new Date())}>Hoje</Button><Button variant="ghost" size="icon" onClick={previous} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={next} aria-label="Próximo"><ChevronRight className="h-4 w-4" /></Button><h2 className="ml-2 text-sm font-semibold capitalize text-white">{title}</h2></div>
          <div className="flex rounded-xl border border-line bg-[#090909] p-1">{(["month", "week", "day"] as View[]).map((item) => <button key={item} onClick={() => setView(item)} className={cn("rounded-lg px-3 py-1.5 text-xs transition", view === item ? "bg-white/[.08] text-white" : "text-zinc-600 hover:text-zinc-300")}>{item === "month" ? "Mês" : item === "week" ? "Semana" : "Dia"}</button>)}</div>
        </div>

        {tasksQuery.isLoading ? <div className="flex min-h-[460px] items-center justify-center text-sm text-muted">Carregando agenda...</div> : view === "month" ? (
          <div><div className="grid grid-cols-7 border-b border-line bg-[#080808]">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <div key={day} className="p-2 text-center text-[10px] uppercase tracking-wider text-zinc-600">{day}</div>)}</div><div className="grid grid-cols-7">{monthDays.map((day) => { const dayTasks = tasksFor(day); return <button key={day.toISOString()} onDoubleClick={() => openAt(day)} onClick={() => { setCursor(day); if (window.innerWidth < 640) setView("day"); }} className={cn("min-h-28 border-b border-r border-line p-2 text-left align-top transition hover:bg-white/[.015]", !isSameMonth(day, cursor) && "bg-black/20 opacity-35")}><span className={cn("flex h-6 w-6 items-center justify-center rounded-lg text-xs text-zinc-500", isSameDay(day, new Date()) && "bg-primary text-white")}>{format(day, "d")}</span><div className="mt-1 space-y-1">{dayTasks.slice(0, 3).map((task) => <div key={task.id} className={cn("truncate rounded-md border-l-2 bg-white/[.035] px-1.5 py-1 text-[9px] text-zinc-400", task.status === "concluído" ? "border-emerald-400 opacity-55" : task.status === "cancelado" ? "border-red-400 opacity-55" : "border-primary")}>{format(new Date(task.scheduled_at), "HH:mm")} {task.title}</div>)}{dayTasks.length > 3 ? <p className="pl-1 text-[9px] text-zinc-600">+{dayTasks.length - 3} tarefas</p> : null}</div></button>; })}</div></div>
        ) : view === "week" ? (
          <div className="grid min-h-[500px] grid-cols-1 divide-y divide-line sm:grid-cols-7 sm:divide-x sm:divide-y-0">{weekDays.map((day) => <div key={day.toISOString()} className="min-w-0 p-3"><button onClick={() => { setCursor(day); setView("day"); }} className="mb-3 w-full text-center"><span className="text-[10px] uppercase text-zinc-600">{format(day, "EEE", { locale: ptBR })}</span><span className={cn("mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-xl text-sm", isSameDay(day, new Date()) ? "bg-primary text-white" : "text-zinc-300")}>{format(day, "d")}</span></button><div className="space-y-2">{tasksFor(day).map((task) => <TaskChip key={task.id} task={task} {...taskActions(task)} />)}<Button variant="ghost" size="sm" className="w-full text-zinc-600" onClick={() => openAt(day)}><Plus className="h-3 w-3" /> Adicionar</Button></div></div>)}</div>
        ) : (
          <div className="min-h-[460px] p-4 sm:p-6"><div className="mx-auto max-w-3xl space-y-3">{tasksFor(cursor).length ? tasksFor(cursor).map((task) => <TaskChip key={task.id} task={task} {...taskActions(task)} />) : <EmptyState icon={CalendarCheck2} title="Dia livre" description="Não há tarefas agendadas para esta data." action={<Button onClick={() => openAt(startOfDay(cursor))}>Criar tarefa</Button>} />}</div></div>
        )}
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title="Nova tarefa" description="Defina data, responsável e lead relacionado."><TaskForm initialDate={selectedDate} leads={leadsQuery.data || []} members={membersQuery.data || []} currentUserId={userId || ""} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createTask.isPending} /></Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir tarefa" description="A tarefa será removida da agenda." size="md"><p className="text-sm text-zinc-400">Excluir <span className="font-medium text-white">{deleteTarget?.title}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteTask.isPending}>Excluir</Button></div></Dialog>
    </>
  );
}
