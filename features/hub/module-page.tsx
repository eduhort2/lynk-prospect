"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type HubField = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "email" | "url" | "relation";
  required?: boolean;
  options?: string[];
  placeholder?: string;
  defaultValue?: string | number;
  relation?: { table: string; valueKey?: string; labelKey: string; orderBy?: string };
};

export type HubColumn = { key: string; label: string; format?: "currency" | "date" | "status" };

type HubModulePageProps = {
  table: string;
  title: string;
  eyebrow: string;
  description: string;
  singular: string;
  fields: HubField[];
  columns: HubColumn[];
  searchKeys?: string[];
  defaultOrder?: string;
  filters?: Record<string, string | boolean>;
};

function formatValue(value: unknown, format?: HubColumn["format"]) {
  if (value === null || value === undefined || value === "") return "—";
  if (format === "currency") return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  if (format === "date") return new Intl.DateTimeFormat("pt-BR").format(new Date(`${String(value).slice(0, 10)}T12:00:00`));
  return String(value);
}

export function HubModulePage({ table, title, eyebrow, description, singular, fields, columns, searchKeys = [], defaultOrder = "created_at", filters = {} }: HubModulePageProps) {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const initialForm = useMemo(() => Object.fromEntries(fields.map((field) => [field.key, field.defaultValue ?? ""])), [fields]);
  const [form, setForm] = useState<Record<string, string | number>>(initialForm);
  const filterKey = JSON.stringify(filters);

  const relationFields = useMemo(() => fields.filter((field) => field.type === "relation" && field.relation), [fields]);
  const relationsQuery = useQuery({
    queryKey: ["hub-relations", table, organizationId, relationFields.map((f) => `${f.key}:${f.relation?.table}`).join("|")],
    enabled: Boolean(organizationId) && relationFields.length > 0,
    queryFn: async () => {
      const entries = await Promise.all(relationFields.map(async (field) => {
        const relation = field.relation!;
        const valueKey = relation.valueKey || "id";
        let request = supabase.from(relation.table).select(`${valueKey},${relation.labelKey}`).eq("organization_id", organizationId!);
        request = request.order(relation.orderBy || relation.labelKey, { ascending: true });
        const { data, error } = await request;
        if (error) throw error;
        return [field.key, data || []] as const;
      }));
      return Object.fromEntries(entries) as Record<string, Record<string, unknown>[]>;
    },
  });

  const query = useQuery({
    queryKey: ["hub-module", table, organizationId, filterKey],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      let request = supabase.from(table).select("*").eq("organization_id", organizationId!);
      for (const [key, value] of Object.entries(filters)) request = request.eq(key, value);
      const { data, error } = await request.order(defaultOrder, { ascending: false });
      if (error) throw error;
      return (data || []) as Record<string, unknown>[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organização não carregada");
      const payload = Object.fromEntries(Object.entries({ ...form, ...filters, organization_id: organizationId }).map(([key, value]) => [key, value === "" ? null : value]));
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["hub-module", table, organizationId] });
      toast.success(`${singular} criado com sucesso`);
      setOpen(false);
      setForm(initialForm);
    },
    onError: (error) => toast.error(`Não foi possível criar ${singular.toLowerCase()}`, { description: error instanceof Error ? error.message : "Tente novamente." }),
  });

  const rows = useMemo(() => (query.data || []).filter((row) => {
    if (!search) return true;
    const needle = search.toLowerCase();
    return searchKeys.some((key) => String(row[key] || "").toLowerCase().includes(needle));
  }), [query.data, search, searchKeys]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const missing = fields.find((field) => field.required && !String(form[field.key] ?? "").trim());
    if (missing) { toast.error(`Preencha ${missing.label}`); return; }
    createMutation.mutate();
  }

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Novo {singular.toLowerCase()}</Button>} />
      {searchKeys.length ? <Card className="mb-5"><CardContent className="p-4"><div className="relative max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Buscar em ${title.toLowerCase()}...`} className="pl-10" /></div></CardContent></Card> : null}
      {query.isLoading ? <Card className="flex min-h-72 items-center justify-center text-sm text-muted">Carregando...</Card> : rows.length ? (
        <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-line bg-white/[.02] text-[10px] uppercase tracking-wider text-zinc-600"><tr>{columns.map((column) => <th key={column.key} className="px-4 py-3 font-medium">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-line">{rows.map((row, index) => <tr key={String(row.id || index)} className="hover:bg-white/[.015]">{columns.map((column) => <td key={column.key} className="px-4 py-3 text-zinc-300">{column.format === "status" ? <span className="rounded-md border border-line bg-white/[.03] px-2 py-1 text-xs">{formatValue(row[column.key])}</span> : formatValue(row[column.key], column.format)}</td>)}</tr>)}</tbody></table></div></Card>
      ) : <Card><EmptyState title={`Nenhum ${singular.toLowerCase()} cadastrado`} description="Use o botão acima para criar o primeiro registro deste módulo." /></Card>}

      <Dialog open={open} onClose={() => setOpen(false)} title={`Novo ${singular.toLowerCase()}`} description="Os dados ficam vinculados à organização atual." size="lg">
        <form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => {
            const value = String(form[field.key] ?? "");
            const common = { id: `hub-${field.key}` };
            return <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}><Label htmlFor={common.id}>{field.label}{field.required ? " *" : ""}</Label>
              {field.type === "select" ? <Select {...common} value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">Selecione</option>{field.options?.map((option) => <option key={option} value={option}>{option}</option>)}</Select>
              : field.type === "relation" && field.relation ? <Select {...common} value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}><option value="">{relationsQuery.isLoading ? "Carregando..." : "Selecione"}</option>{(relationsQuery.data?.[field.key] || []).map((row) => { const valueKey = field.relation?.valueKey || "id"; return <option key={String(row[valueKey])} value={String(row[valueKey])}>{String(row[field.relation!.labelKey])}</option>; })}</Select>
              : field.type === "textarea" ? <Textarea {...common} value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))} placeholder={field.placeholder} />
              : <Input {...common} type={field.type === "number" ? "number" : field.type || "text"} value={value} onChange={(event) => setForm((current) => ({ ...current, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value }))} placeholder={field.placeholder} />}
            </div>;
          })}
        </div><div className="flex justify-end gap-2 border-t border-line pt-5"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? "Salvando..." : "Salvar"}</Button></div></form>
      </Dialog>
    </>
  );
}
