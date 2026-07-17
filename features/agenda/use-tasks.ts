"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useOrganization } from "@/features/auth/organization-provider";
import type { Task, TaskStatus } from "@/types";
import type { TaskFormValues } from "@/lib/validations/task";

export function useTasks() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["tasks", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*,lead:lead_id(id,company_name),responsible:user_id(id,name)")
        .eq("organization_id", organizationId!)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        lead: Array.isArray(row.lead) ? row.lead[0] : row.lead,
        responsible: Array.isArray(row.responsible) ? row.responsible[0] : row.responsible,
      })) as Task[];
    },
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (values: TaskFormValues) => {
      if (!organizationId) throw new Error("Organização não carregada");
      const { data, error } = await supabase.from("tasks").insert({
        ...values,
        organization_id: organizationId,
        lead_id: values.lead_id || null,
        scheduled_at: new Date(values.scheduled_at).toISOString(),
      }).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<TaskFormValues> & { status?: TaskStatus } }) => {
      const payload = { ...values, ...(values.scheduled_at ? { scheduled_at: new Date(values.scheduled_at).toISOString() } : {}) };
      const { data, error } = await supabase.from("tasks").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data as Task;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] }),
  });
}
