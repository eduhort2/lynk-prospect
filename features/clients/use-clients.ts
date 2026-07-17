"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useOrganization } from "@/features/auth/organization-provider";
import type { Client } from "@/types";
import type { ClientFormValues } from "@/lib/validations/client";

export function useClients() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["clients", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("*").eq("organization_id", organizationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Client[];
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (values: ClientFormValues) => {
      if (!organizationId) throw new Error("Organização não carregada");
      const { data, error } = await supabase.from("clients").insert({ ...values, organization_id: organizationId, lead_id: values.lead_id || null }).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", organizationId] }),
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ClientFormValues }) => {
      const { data, error } = await supabase.from("clients").update({ ...values, lead_id: values.lead_id || null }).eq("id", id).select().single();
      if (error) throw error;
      return data as Client;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", organizationId] }),
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients", organizationId] }),
  });
}
