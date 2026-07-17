"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { useOrganization } from "@/features/auth/organization-provider";
import type { PromptGeneration } from "@/types";

export function usePromptHistory() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["prompts", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("prompt_generations").select("*").eq("organization_id", organizationId!).order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return (data || []) as PromptGeneration[];
    },
  });
}

export function useSavePrompt() {
  const queryClient = useQueryClient();
  const { organizationId, userId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (values: Pick<PromptGeneration, "company_name" | "segment" | "city" | "objective" | "prompt">) => {
      if (!organizationId || !userId) throw new Error("Contexto do usuário não carregado");
      const { data, error } = await supabase.from("prompt_generations").insert({ ...values, organization_id: organizationId, user_id: userId }).select().single();
      if (error) throw error;
      return data as PromptGeneration;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", organizationId] }),
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prompt_generations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["prompts", organizationId] }),
  });
}
