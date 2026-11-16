"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Lead, LeadStatus } from "@/types";
import { useOrganization } from "@/features/auth/organization-provider";
import type { LeadFormValues } from "@/lib/validations/lead";
import { buildLeadImportKey } from "./import-key";
import type { ImportedLeadRow } from "./importer";

type LeadUpdateValues = Partial<LeadFormValues> & Partial<Pick<Lead, "contacted_at" | "prospecting_status" | "response" | "observations" | "whatsapp_opt_in">>;

/** Campos de texto vazios viram null; o serviço vazio não pode ir como "" (restrição do banco). */
function cleanLeadValues<T extends Partial<LeadFormValues>>(values: T) {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    cleaned[key] = typeof value === "string" && key !== "company_name" ? (value.trim() || null) : value;
  }
  if (typeof cleaned.state === "string") cleaned.state = cleaned.state.toUpperCase();
  if ("website" in cleaned) cleaned.has_website = Boolean(cleaned.website);
  if ("marketplace_listings" in cleaned) cleaned.marketplace_listings = cleaned.marketplace_listings === null ? null : Number(cleaned.marketplace_listings);
  // Detalhe do serviço só faz sentido para "Outro" e "Loja no Mercado Livre".
  if ("suggested_service" in cleaned && cleaned.suggested_service !== "Outro" && cleaned.suggested_service !== "Loja no Mercado Livre") cleaned.suggested_service_detail = null;
  return cleaned;
}

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
        whatsapp_confirmed: Boolean(row.whatsapp_confirmed),
        suggested_service: row.suggested_service ?? null,
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
        ...cleanLeadValues(values),
        company_name: values.company_name.trim(),
        organization_id: organizationId,
        responsible_user: userId,
        import_key: buildLeadImportKey({
          company_name: values.company_name,
          whatsapp: values.whatsapp,
          phone: values.phone,
          city: values.city,
        }),
      };
      const { data, error } = await supabase.from("leads").insert(payload).select().single();
      if (error) {
        if (error.code === "23505") throw new Error("Já existe um lead com este telefone/WhatsApp ou com o mesmo nome e cidade.");
        throw error;
      }
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
      const { contacted_at, prospecting_status, response, whatsapp_opt_in, ...formValues } = values;
      const payload = {
        ...cleanLeadValues(formValues),
        ...(contacted_at !== undefined ? { contacted_at } : {}),
        ...(response !== undefined ? { response } : {}),
        ...(whatsapp_opt_in !== undefined ? { whatsapp_opt_in, whatsapp_opt_in_at: whatsapp_opt_in ? new Date().toISOString() : null } : {}),
        ...(prospecting_status ? { prospecting_status } : values.status ? { prospecting_status: values.status } : {}),
      };
      const { data, error } = await supabase.from("leads").update(payload).eq("id", id).select().single();
      if (error) throw error;
      return data as Lead;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["clients", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads", organizationId] });
      queryClient.invalidateQueries({ queryKey: ["tasks", organizationId] });
    },
  });
}

/**
 * Importação com deduplicação pela chave (organization_id, import_key).
 * ignoreDuplicates = ON CONFLICT DO NOTHING: o lead já cadastrado não é
 * sobrescrito, então etapa, notas e mensagem editadas são preservadas.
 */
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
      return { total: rows.length, imported, skipped: rows.length - imported, ids: (data || []).map((row: { id: string }) => row.id) };
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["leads", organizationId] }),
  });
}
