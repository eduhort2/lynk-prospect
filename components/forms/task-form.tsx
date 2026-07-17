"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { taskSchema, type TaskFormValues } from "@/lib/validations/task";
import type { Lead, OrganizationMember } from "@/types";

export function TaskForm({
  initialDate,
  leads,
  members,
  currentUserId,
  onSubmit,
  onCancel,
  loading,
}: {
  initialDate?: Date;
  leads: Lead[];
  members: OrganizationMember[];
  currentUserId: string;
  onSubmit: (values: TaskFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const date = initialDate || new Date(Date.now() + 60 * 60 * 1000);
  const { register, handleSubmit, formState: { errors } } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      scheduled_at: format(date, "yyyy-MM-dd'T'HH:mm"),
      lead_id: "",
      user_id: currentUserId,
      status: "pendente",
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><Label htmlFor="task-title">Título *</Label><Input id="task-title" placeholder="Ex.: Retorno da proposta" {...register("title")} />{errors.title ? <p className="mt-1 text-xs text-red-400">{errors.title.message}</p> : null}</div>
      <div><Label htmlFor="scheduled_at">Data e horário *</Label><Input id="scheduled_at" type="datetime-local" {...register("scheduled_at")} />{errors.scheduled_at ? <p className="mt-1 text-xs text-red-400">{errors.scheduled_at.message}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="lead_id">Lead relacionado</Label><Select id="lead_id" {...register("lead_id")}><option value="">Sem lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</Select></div>
        <div><Label htmlFor="user_id">Responsável</Label><Select id="user_id" {...register("user_id")}>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profile?.name || member.profile?.email}</option>)}</Select>{errors.user_id ? <p className="mt-1 text-xs text-red-400">{errors.user_id.message}</p> : null}</div>
      </div>
      <div><Label htmlFor="task-description">Descrição</Label><Textarea id="task-description" placeholder="Detalhes para executar a tarefa..." {...register("description")} /></div>
      <div className="flex justify-end gap-2 border-t border-line pt-5"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando..." : "Criar tarefa"}</Button></div>
    </form>
  );
}
