"use client";

import { isBefore, isSameDay, startOfDay } from "date-fns";
import { useMemo } from "react";
import { useOrganization } from "@/features/auth/organization-provider";
import { useCreateTask, useTasks, useUpdateTask } from "@/features/agenda/use-tasks";
import type { Lead, Task } from "@/types";

/**
 * "Próximo retorno" reaproveita a tabela de tarefas: é a tarefa pendente mais
 * próxima vinculada ao lead. Assim o retorno aparece também na Agenda.
 */
export function useFollowUps() {
  const tasks = useTasks();
  const byLead = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks.data || []) {
      if (task.status !== "pendente" || !task.lead_id) continue;
      const current = map.get(task.lead_id);
      if (!current || new Date(task.scheduled_at) < new Date(current.scheduled_at)) map.set(task.lead_id, task);
    }
    return map;
  }, [tasks.data]);
  return { ...tasks, byLead };
}

export type FollowUpBucket = "overdue" | "today" | "upcoming";

export function followUpBucket(date: string | Date, now = new Date()): FollowUpBucket {
  const value = new Date(date);
  if (isSameDay(value, now)) return "today";
  return isBefore(value, startOfDay(now)) ? "overdue" : "upcoming";
}

export function useScheduleFollowUp() {
  const { userId } = useOrganization();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  async function schedule(lead: Pick<Lead, "id" | "company_name">, current: Task | undefined, scheduledAt: string) {
    if (current) return updateTask.mutateAsync({ id: current.id, values: { scheduled_at: scheduledAt } });
    if (!userId) throw new Error("Usuário não carregado");
    return createTask.mutateAsync({
      title: `Retorno: ${lead.company_name}`,
      description: "",
      scheduled_at: scheduledAt,
      lead_id: lead.id,
      user_id: userId,
      status: "pendente",
    });
  }

  async function complete(task: Task) {
    return updateTask.mutateAsync({ id: task.id, values: { status: "concluído" } });
  }

  async function cancel(task: Task) {
    return updateTask.mutateAsync({ id: task.id, values: { status: "cancelado" } });
  }

  return { schedule, complete, cancel, isPending: createTask.isPending || updateTask.isPending };
}
