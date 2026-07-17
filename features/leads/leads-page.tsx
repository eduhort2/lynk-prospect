"use client";

import { Copy, Download, ExternalLink, FileSpreadsheet, Filter, Plus, Search, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { LeadForm } from "@/components/forms/lead-form";
import { LeadsTable } from "@/components/tables/leads-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useMembers } from "@/features/auth/use-members";
import type { LeadFormValues } from "@/lib/validations/lead";
import { LEAD_STATUSES, type Lead, type LeadStatus, type Priority } from "@/types";
import { formatDate } from "@/lib/utils";
import { parseProspectingWorkbook } from "./importer";
import { useCreateLead, useDeleteLead, useImportLeads, useLeads, useUpdateLead } from "./use-leads";

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function LeadsPage() {
  const leadsQuery = useLeads();
  const membersQuery = useMembers();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const importLeads = useImportLeads();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);

  const filtered = useMemo(() => {
    const query = normalize(search);
    return (leadsQuery.data || []).filter((lead) => {
      const matchesText = !query || [lead.company_name, lead.contact_name, lead.email, lead.whatsapp, lead.segment, lead.city].some((value) => normalize(value || "").includes(query));
      return matchesText && (!status || lead.status === status) && (!priority || lead.priority === priority);
    });
  }, [leadsQuery.data, priority, search, status]);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(lead: Lead) { setEditing(lead); setFormOpen(true); }

  function getContactUrl(lead: Lead) {
    if (lead.contact_link) return lead.contact_link;
    const phone = (lead.whatsapp || lead.phone || "").replace(/\D/g, "");
    if (phone) return `https://wa.me/${phone}${lead.message ? `?text=${encodeURIComponent(lead.message)}` : ""}`;
    return lead.instagram || "";
  }

  async function contactLead(lead: Lead) {
    const url = getContactUrl(lead);
    if (!url) return toast.error("Este lead não possui canal de contato");
    window.open(url, "_blank", "noopener,noreferrer");
    if (lead.status !== "Novo") return;
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        values: {
          status: "Contato enviado",
          prospecting_status: "Contato enviado",
          contacted_at: new Date().toISOString(),
        },
        previousStatus: lead.status,
      });
      setViewing((current) => current?.id === lead.id ? { ...current, status: "Contato enviado" } : current);
      toast.success("Contato aberto e lead marcado como Contato enviado");
    } catch (error) {
      toast.error("O contato foi aberto, mas o status não foi atualizado", { description: error instanceof Error ? error.message : "Atualize o lead manualmente." });
    }
  }

  async function submit(values: LeadFormValues) {
    try {
      if (editing) await updateLead.mutateAsync({ id: editing.id, values, previousStatus: editing.status });
      else await createLead.mutateAsync(values);
      toast.success(editing ? "Lead atualizado" : "Lead criado com sucesso");
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error("Não foi possível salvar o lead", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      toast.success("Lead excluído");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Não foi possível excluir", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const parsed = parseProspectingWorkbook(workbook, file.name);
      if (!parsed.rows.length) throw new Error("Nenhum lead válido foi encontrado na planilha");
      const result = await importLeads.mutateAsync(parsed.rows);
      toast.success(`Planilha lida: ${result.imported} novos leads`, {
        description: `${result.skipped} duplicados ignorados · aba ${parsed.sheetName}`,
      });
    } catch (error) {
      toast.error("Falha na importação", { description: error instanceof Error ? error.message : "Revise o arquivo." });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadModel() {
    const sheet = XLSX.utils.json_to_sheet([{
      ID: 1,
      Prioridade: "Alta",
      Negócio: "Empresa Exemplo",
      Segmento: "Restaurante",
      Bairro: "Centro",
      Telefone: "+5541999999999",
      Instagram: "https://www.instagram.com/empresa/",
      "Status do site": "Site institucional não localizado; reconfirmar",
      "Diferenciais observados": "Diferenciais confirmados na pesquisa",
      "Oportunidade da landing page": "Objetivo comercial da página",
      "Mensagem personalizada": "Mensagem pronta para o primeiro contato",
      "Link para contato": "https://wa.me/5541999999999",
      "Melhor dia": "terça a quinta",
      "Melhor horário": "14:00–16:00",
      "Motivo do horário": "Maior chance de leitura.",
      "Fonte pública": "https://...",
      "Fonte de imagens": "https://...",
      "Prompt para gerar site": "Prompt completo da landing page",
      "Status prospecção": "Não contatado",
      "Data do contato": "",
      Resposta: "",
      "Valor oferecido": 500,
      Observações: "",
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "100 Leads");
    XLSX.writeFile(workbook, "modelo-prospeccao-diaria-lynk.xlsx");
  }

  return (
    <>
      <PageHeader eyebrow="CRM" title="Leads" description="Centralize contatos, contexto e progresso de cada oportunidade comercial." actions={<><Button variant="secondary" onClick={downloadModel}><Download className="h-4 w-4" /> Modelo</Button><Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importLeads.isPending}><Upload className="h-4 w-4" /> {importLeads.isPending ? "Importando..." : "Importar Excel"}</Button><Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo lead</Button><input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} /></>}/>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa, contato, cidade..." className="pl-10" /></div>
          <div className="flex gap-2"><div className="relative min-w-44"><Filter className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-600" /><Select className="pl-9" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "")}><option value="">Todos os status</option>{LEAD_STATUSES.map((item) => <option key={item}>{item}</option>)}</Select></div><Select className="min-w-36" value={priority} onChange={(event) => setPriority(event.target.value as Priority | "")}><option value="">Prioridade</option><option>Alta</option><option>Média</option><option>Baixa</option></Select></div>
        </div>
        {leadsQuery.isLoading ? <div className="flex min-h-64 items-center justify-center text-sm text-muted">Carregando leads...</div> : leadsQuery.isError ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-red-300"><FileSpreadsheet className="h-6 w-6" /> {leadsQuery.error.message}<Button variant="secondary" onClick={() => leadsQuery.refetch()}>Tentar novamente</Button></div> : <LeadsTable leads={filtered} onView={setViewing} onContact={contactLead} onEdit={openEdit} onDelete={setDeleteTarget} onCreate={openCreate} />}
        {!leadsQuery.isLoading && leadsQuery.data?.length ? <div className="border-t border-line px-5 py-3 text-xs text-zinc-600">Mostrando {filtered.length} de {leadsQuery.data.length} leads</div> : null}
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar lead" : "Novo lead"} description="Preencha os dados confirmados da oportunidade." size="xl"><LeadForm key={editing?.id || "new"} lead={editing} members={membersQuery.data || []} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createLead.isPending || updateLead.isPending} /></Dialog>
      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.company_name || "Detalhes do lead"} description="Abordagem e informações importadas da planilha diária." size="xl">
        {viewing ? <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
            ["Segmento", viewing.segment || "Não informado"],
            ["Localização", [viewing.neighborhood, viewing.city, viewing.state].filter(Boolean).join(" · ") || "Não informada"],
            ["Melhor dia", viewing.best_contact_day || "Não informado"],
            ["Melhor horário", viewing.best_contact_time || "Não informado"],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-[#090909] p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-2 text-sm text-zinc-200">{value}</p></div>)}</div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-line bg-[#090909] p-4"><p className="text-xs font-medium text-zinc-300">Diferenciais observados</p><p className="mt-2 text-sm leading-relaxed text-zinc-500">{viewing.differentiators || "Não informado"}</p></div><div className="rounded-xl border border-line bg-[#090909] p-4"><p className="text-xs font-medium text-zinc-300">Oportunidade da landing page</p><p className="mt-2 text-sm leading-relaxed text-zinc-500">{viewing.landing_page_opportunity || "Não informada"}</p></div></div>
          <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium text-zinc-300">Mensagem personalizada</p><Button variant="ghost" size="sm" onClick={async () => { await navigator.clipboard.writeText(viewing.message || ""); toast.success("Mensagem copiada"); }} disabled={!viewing.message}><Copy className="h-3.5 w-3.5" /> Copiar</Button></div><div className="rounded-xl border border-line bg-[#090909] p-4 text-sm leading-relaxed text-zinc-400">{viewing.message || "Mensagem não informada"}</div></div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-line bg-[#090909] p-4"><p className="text-xs font-medium text-zinc-300">Situação do site</p><p className="mt-2 text-sm text-zinc-500">{viewing.website_status || "Não informada"}</p></div><div className="rounded-xl border border-line bg-[#090909] p-4"><p className="text-xs font-medium text-zinc-300">Motivo do horário</p><p className="mt-2 text-sm text-zinc-500">{viewing.contact_time_reason || "Não informado"}</p></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><p className="text-xs text-zinc-600">Importado em {formatDate(viewing.created_at, true)}{viewing.offered_value ? ` · Oferta: ${viewing.offered_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}</p><div className="flex gap-2">{viewing.public_source ? <Button variant="secondary" onClick={() => window.open(viewing.public_source!, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /> Abrir fonte</Button> : null}{getContactUrl(viewing) ? <Button onClick={() => contactLead(viewing)}><ExternalLink className="h-4 w-4" /> Abrir e marcar envio</Button> : null}</div></div>
        </div> : null}
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir lead" description="Esta ação remove o lead e o histórico vinculado." size="md"><p className="text-sm text-zinc-400">Tem certeza que deseja excluir <span className="font-medium text-white">{deleteTarget?.company_name}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteLead.isPending}>{deleteLead.isPending ? "Excluindo..." : "Excluir definitivamente"}</Button></div></Dialog>
    </>
  );
}
