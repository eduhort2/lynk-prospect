"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useOrganization } from "@/features/auth/organization-provider";
import type { Project } from "@/types";
import type { ProjectFormValues } from "@/lib/validations/project";

export function useProjects() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["projects", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*,client:client_id(id,company_name)").eq("organization_id", organizationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({ ...row, client: Array.isArray(row.client) ? row.client[0] : row.client })) as Project[];
    },
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      if (!organizationId) throw new Error("Organização não carregada");
      const payload = Object.fromEntries(Object.entries({ ...values, organization_id: organizationId }).map(([key, value]) => [key, value === "" ? null : value]));
      const { data, error } = await supabase.from("projects").insert(payload).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", organizationId] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ProjectFormValues }) => {
      const payload = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === "" ? null : value]));
      const { data, error } = await supabase.from("projects").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data as Project;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", organizationId] }),
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects", organizationId] }),
  });
}
