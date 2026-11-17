"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Lead } from "@/types";
import { statusesOfStage, type StageStatus } from "./stages";

/** Quantidade de leads carregados por vez (lista e colunas do pipeline). */
export const PAGE_SIZES = [10, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
const PAGE_SIZE_KEY = "lynk:page-size";
const DEFAULT_PAGE_SIZE: PageSize = 50;

/** Preferência por usuário/navegador. Sem acesso ao armazenamento, usa 50. */
export function usePageSize() {
  const [pageSize, setPageSizeState] = useState<PageSize>(DEFAULT_PAGE_SIZE);
  useEffect(() => {
    try {
      const saved = Number(window.localStorage.getItem(PAGE_SIZE_KEY));
      if (PAGE_SIZES.includes(saved as PageSize)) setPageSizeState(saved as PageSize);
    } catch { /* armazenamento indisponível */ }
  }, []);
  const setPageSize = useCallback((value: PageSize) => {
    setPageSizeState(value);
    try { window.localStorage.setItem(PAGE_SIZE_KEY, String(value)); } catch { /* ignora */ }
  }, []);
  return [pageSize, setPageSize] as const;
}

/** Remove caracteres que quebram o filtro `or` do PostgREST. */
function searchPattern(search: string) {
  const clean = search.replace(/[%,()*"'\\:]/g, " ").replace(/\s+/g, " ").trim();
  return clean ? `%${clean}%` : "";
}

const SEARCH_COLUMNS = ["company_name", "city", "contact_name", "email", "phone", "whatsapp"];

export type LeadPageParams = {
  search: string;
  stage: StageStatus | "";
  service: string;
  /** "messageable" = só leads com WhatsApp (confirmado ou celular) ou Instagram (coluna has_message_channel). */
  channel?: "messageable" | "all";
  page: number;
  pageSize: PageSize;
};

/**
 * Lista paginada no servidor: só a página atual vem do banco. Busca, filtros e
 * contagem total também são feitos no Supabase.
 */
export function useLeadsPage(params: LeadPageParams) {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["leads", organizationId, "page", params],
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const from = (params.page - 1) * params.pageSize;
      let query = supabase
        .from("leads")
        .select("*", { count: "exact" })
        .eq("organization_id", organizationId!);
      const pattern = searchPattern(params.search);
      if (pattern) query = query.or(SEARCH_COLUMNS.map((column) => `${column}.ilike.${pattern}`).join(","));
      if (params.stage) query = query.in("status", statusesOfStage(params.stage));
      if (params.channel === "messageable") query = query.eq("has_message_channel", true);
      if (params.service === "none") query = query.is("suggested_service", null);
      else if (params.service) query = query.eq("suggested_service", params.service);
      const { data, error, count } = await query
        .order("created_at", { ascending: false })
        .order("id", { ascending: true })
        .range(from, from + params.pageSize - 1);
      if (error) throw error;
      return { rows: (data || []).map((row) => ({ ...row, whatsapp_confirmed: Boolean(row.whatsapp_confirmed) })) as Lead[], total: count ?? 0 };
    },
  });
}

/** Total de leads da organização (sem filtros). */
export function useLeadCount() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["leads", organizationId, "count"],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { count, error } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
}

/** Um lead completo, para a ficha aberta por link (?lead=id), mesmo fora da página atual. */
export function useLead(id: string | null) {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["leads", organizationId, "one", id],
    enabled: Boolean(organizationId && id),
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data ? ({ ...data, whatsapp_confirmed: Boolean(data.whatsapp_confirmed) } as Lead) : null;
    },
  });
}

const PIPELINE_COLUMNS = "id,company_name,segment,city,state,status,suggested_service,whatsapp,whatsapp_confirmed,contact_link,updated_at,created_at";

/** Uma coluna do pipeline: só os primeiros `limit` cards, mais o total da etapa. */
export function usePipelineColumn(stage: StageStatus, limit: number) {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["leads", organizationId, "pipeline", stage, limit],
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("leads")
        .select(PIPELINE_COLUMNS, { count: "exact" })
        .eq("organization_id", organizationId!)
        .in("status", statusesOfStage(stage))
        .order("updated_at", { ascending: false })
        .order("id", { ascending: true })
        .range(0, limit - 1);
      if (error) throw error;
      return { rows: (data || []) as unknown as Lead[], total: count ?? 0 };
    },
  });
}

/** Nomes para seletores (ex.: tarefa da Agenda), sem carregar os leads inteiros. */
export function useLeadNames() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["leads", organizationId, "names"],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("id,company_name").eq("organization_id", organizationId!).order("company_name").limit(1000);
      if (error) throw error;
      return (data || []) as Pick<Lead, "id" | "company_name">[];
    },
  });
}
