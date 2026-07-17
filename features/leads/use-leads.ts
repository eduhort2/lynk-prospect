"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types";
import { useOrganization } from "@/features/auth/organization-provider";
import type { LeadFormValues } from "@/lib/validations/lead";
import { buildLeadImportKey } from "./import-key";
import type { ImportedLeadRow } from "./importer";

type LeadUpdateValues = Partial<LeadFormValues> & Partial<Pick<Lead, "contacted_at" | "prospecting_status" | "response" | "observations">>;

export function useLeads() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  return useQuery({
    queryKey: ["leads", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*,responsible:responsible_user(id,name,email)")
        .eq("organization_id", organizationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        responsible: Array.isArray(row.responsible) ? row.responsible[0] : row.responsible,
      })) as Lead[];
    },
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();
  const { organizationId, userId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  return useMutation({
    mutationFn: async (values: LeadFormValues) => {
      if (!organizationId) throw new Error("Organização não carregada");
      const payload = {
        ...values,
        organization_id: organizationId,
        responsible_user: values.responsible_user || userId,
        email: values.email || null,
        state: values.state?.toUpperCase() || null,
        import_key: buildLeadImportKey({
          company_name: values.company_name,
          instagram: values.instagram,
          whatsapp: values.whatsapp,
          phone: values.phone,
          city: values.city,
        }),
      };
      const { data, error } = await supabase.from("leads").insert(payload).select().single();
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", organizationId] }),
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: LeadUpdateValues; previousStatus?: LeadStatus }) => {
      const payload = {
        ...values,
        state: values.state?.toUpperCase() || values.state,
        ...(values.status && !values.prospecting_status ? { prospecting_status: values.status } : {}),
      };
      const { data, error } = await supabase.from("leads").update(payload).eq("id", id).select().single();
      if (error) throw error;

      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["clients", organizationId] });
    },
  });
}

export function useDeleteLead() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", organizationId] }),
  });
}

export function useImportLeads() {
  const queryClient = useQueryClient();
  const { organizationId, userId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useMutation({
    mutationFn: async (rows: ImportedLeadRow[]) => {
      if (!organizationId) throw new Error("Organização não carregada");
      const payload = rows.map((row) => ({
        ...row,
        organization_id: organizationId,
        responsible_user: row.responsible_user || userId,
        status: row.status || "Novo",
        priority: row.priority || "Média",
      }));
      const { data, error } = await supabase
        .from("leads")
        .upsert(payload, {
          onConflict: "organization_id,import_key",
          ignoreDuplicates: true,
        })
        .select("id");
      if (error) throw error;
      const imported = data?.length || 0;
      return { total: rows.length, imported, skipped: rows.length - imported };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", organizationId] }),
  });
}
