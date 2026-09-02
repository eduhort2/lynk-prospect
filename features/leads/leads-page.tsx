"use client";

import { Copy, Download, ExternalLink, FileSpreadsheet, Filter, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const leadsQuery = useLeads();
  const membersQuery = useMembers();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const importLeads = useImportLeads();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [priority, setPriority] = useState<Priority | "">("");
  const [responsibleUser, setResponsibleUser] = useState("");
  const [editing, setEditing] = useState<Lead | null>(null);
  const [viewing, setViewing] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const filtered = useMemo(() => {
    const query = normalize(search);
    return (leadsQuery.data || []).filter((lead) => {
      const matchesText = !query || [lead.company_name, lead.contact_name, lead.email, lead.whatsapp, lead.segment, lead.city].some((value) => normalize(value || "").includes(query));
      return matchesText
        && (!status || lead.status === status)
        && (!priority || lead.priority === priority)
        && (!responsibleUser || lead.responsible_user === responsibleUser);
    });
  }, [leadsQuery.data, priority, responsibleUser, search, status]);

  const summary = useMemo(() => {
    const leads = leadsQuery.data || [];
    return [
      { label: "Todos", value: leads.length, dot: "bg-primary" },
      { label: "Novos", value: leads.filter((lead) => lead.status === "Novo").length, dot: "bg-slate-400" },
      { label: "Em contato", value: leads.filter((lead) => ["Contato enviado", "Respondeu", "Reunião marcada"].includes(lead.status)).length, dot: "bg-sky-400" },
      { label: "Propostas", value: leads.filter((lead) => ["Proposta enviada", "Negociação"].includes(lead.status)).length, dot: "bg-violet-400" },
      { label: "Fechados", value: leads.filter((lead) => lead.status === "Fechado").length, dot: "bg-emerald-400" },
      { label: "Perdidos", value: leads.filter((lead) => lead.status === "Perdido").length, dot: "bg-red-400" },
    ];
  }, [leadsQuery.data]);

  const hasFilters = Boolean(search || status || priority || responsibleUser);

  function clearFilters() {
    setSearch("");
    setStatus("");
    setPriority("");
    setResponsibleUser("");
  }

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

  async function sendViaApi(lead: Lead, channel: "whatsapp" | "email") {
    try {
      const response = await fetch(`/api/${channel}/send`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leadId: lead.id }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar");
      await leadsQuery.refetch();
      toast.success(channel === "whatsapp" ? "Mensagem enviada pelo WhatsApp" : "E-mail enviado pelo domínio da LYNK");
    } catch (error) {
      toast.error("Envio não realizado", { description: error instanceof Error ? error.message : "Revise a integração." });
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      const response = await fetch("/api/leads/clear", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível limpar os leads");
      await leadsQuery.refetch();
      setClearOpen(false);
      toast.success(`${data.deleted} leads removidos`);
    } catch (error) {
      toast.error("Limpeza não concluída", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setClearing(false); }
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const parsed = parseProspectingWorkbook(workbook, file.name);
      if (!parsed.rows.length) throw new Error("Nenhum lead válido foi encontrado na planilha");
      const result = await importLeads.mutateAsync(parsed.rows);
      if (result.ids.length) {
        const dispatch = await fetch("/api/whatsapp/send-batch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leadIds: result.ids }) });
        if (dispatch.ok) {
          const automation = await dispatch.json();
          if (automation.sent) toast.success(`${automation.sent} primeiros contatos enviados automaticamente`);
        }
      }
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
      "Consentimento WhatsApp": "Não",
      "Origem do consentimento": "",
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
      <PageHeader
        eyebrow="CRM"
        title="Leads"
        description="Centralize contatos, contexto e progresso de cada oportunidade comercial."
        actions={
          <>
            <Button variant="ghost" className="hidden text-red-300 lg:inline-flex" onClick={() => setClearOpen(true)} disabled={!leadsQuery.data?.length}><Trash2 className="h-4 w-4" /> Limpar leads</Button>
            <Button variant="secondary" className="hidden xl:inline-flex" onClick={downloadModel}><Download className="h-4 w-4" /> Modelo</Button>
            <Button variant="secondary" className="hidden sm:inline-flex" onClick={() => fileRef.current?.click()} disabled={importLeads.isPending}><Upload className="h-4 w-4" /> {importLeads.isPending ? "Importando..." : "Importar Excel"}</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo lead</Button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(event) => handleImport(event.target.files?.[0])} />
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="overflow-x-auto border-b border-line/80">
          <div className="grid min-w-[720px] grid-cols-6 divide-x divide-line/70">
            {summary.map((item) => (
              <div key={item.label} className="px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
                  <p className="text-[10px] uppercase tracking-[.12em] text-zinc-600">{item.label}</p>
                </div>
                <p className="mt-2 text-xl font-semibold tracking-tight text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-b border-line p-3 sm:p-4">
          <div className="grid gap-2 lg:grid-cols-[minmax(260px,1fr)_180px_180px_170px_auto]">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa, contato, cidade, e-mail ou telefone..." className="h-10 pl-10" />
            </div>
            <div className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-zinc-600" />
              <Select className="h-10 pl-9" value={status} onChange={(event) => setStatus(event.target.value as LeadStatus | "")}>
                <option value="">Todos os status</option>
                {LEAD_STATUSES.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </div>
            <Select className="h-10" value={responsibleUser} onChange={(event) => setResponsibleUser(event.target.value)}>
              <option value="">Todos responsáveis</option>
              {(membersQuery.data || []).map((member) => <option key={member.user_id} value={member.user_id}>{member.profile?.name || member.user_id}</option>)}
            </Select>
            <Select className="h-10" value={priority} onChange={(event) => setPriority(event.target.value as Priority | "")}>
              <option value="">Todas prioridades</option>
              <option>Alta</option>
              <option>Média</option>
              <option>Baixa</option>
            </Select>
            {hasFilters ? <Button variant="ghost" className="h-10 justify-center px-3 text-zinc-400" onClick={clearFilters}><X className="h-4 w-4" /> Limpar</Button> : <div className="hidden lg:block" />}
          </div>
        </div>

        {leadsQuery.isLoading ? (
          <div className="flex min-h-64 items-center justify-center text-sm text-muted">Carregando leads...</div>
        ) : leadsQuery.isError ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-red-300"><FileSpreadsheet className="h-6 w-6" /> {leadsQuery.error.message}<Button variant="secondary" onClick={() => leadsQuery.refetch()}>Tentar novamente</Button></div>
        ) : (
          <LeadsTable leads={filtered} onView={setViewing} onContact={contactLead} onEdit={openEdit} onDelete={setDeleteTarget} onCreate={openCreate} onWhatsAppApi={(lead) => sendViaApi(lead, "whatsapp")} onEmail={(lead) => sendViaApi(lead, "email")} />
        )}

        {!leadsQuery.isLoading && leadsQuery.data?.length ? (
          <div className="flex flex-col gap-2 border-t border-line px-4 py-3 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <span>Mostrando {filtered.length} de {leadsQuery.data.length} leads</span>
            <span className="text-zinc-700">Use a busca e os filtros para encontrar oportunidades mais rápido.</span>
          </div>
        ) : null}
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar lead" : "Novo lead"} description="Preencha os dados confirmados da oportunidade." size="xl"><LeadForm key={editing?.id || "new"} lead={editing} members={membersQuery.data || []} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createLead.isPending || updateLead.isPending} /></Dialog>
      <Dialog open={Boolean(viewing)} onClose={() => setViewing(null)} title={viewing?.company_name || "Detalhes do lead"} description="Abordagem e informações importadas da planilha diária." size="xl">
        {viewing ? <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[
            ["Segmento", viewing.segment || "Não informado"],
            ["Localização", [viewing.neighborhood, viewing.city, viewing.state].filter(Boolean).join(" · ") || "Não informada"],
            ["Melhor dia", viewing.best_contact_day || "Não informado"],
            ["Melhor horário", viewing.best_contact_time || "Não informado"],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-card p-3"><p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p><p className="mt-2 text-sm text-zinc-200">{value}</p></div>)}</div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-line bg-card p-4"><p className="text-xs font-medium text-zinc-300">Diferenciais observados</p><p className="mt-2 text-sm leading-relaxed text-zinc-500">{viewing.differentiators || "Não informado"}</p></div><div className="rounded-xl border border-line bg-card p-4"><p className="text-xs font-medium text-zinc-300">Oportunidade da landing page</p><p className="mt-2 text-sm leading-relaxed text-zinc-500">{viewing.landing_page_opportunity || "Não informada"}</p></div></div>
          <div><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium text-zinc-300">Mensagem personalizada</p><Button variant="ghost" size="sm" onClick={async () => { await navigator.clipboard.writeText(viewing.message || ""); toast.success("Mensagem copiada"); }} disabled={!viewing.message}><Copy className="h-3.5 w-3.5" /> Copiar</Button></div><div className="rounded-xl border border-line bg-card p-4 text-sm leading-relaxed text-zinc-400">{viewing.message || "Mensagem não informada"}</div></div>
          <div className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-line bg-card p-4"><p className="text-xs font-medium text-zinc-300">Situação do site</p><p className="mt-2 text-sm text-zinc-500">{viewing.website_status || "Não informada"}</p></div><div className="rounded-xl border border-line bg-card p-4"><p className="text-xs font-medium text-zinc-300">Motivo do horário</p><p className="mt-2 text-sm text-zinc-500">{viewing.contact_time_reason || "Não informado"}</p></div></div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5"><p className="text-xs text-zinc-600">Importado em {formatDate(viewing.created_at, true)}{viewing.offered_value ? ` · Oferta: ${viewing.offered_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}` : ""}</p><div className="flex gap-2">{viewing.public_source ? <Button variant="secondary" onClick={() => window.open(viewing.public_source!, "_blank", "noopener,noreferrer")}><ExternalLink className="h-4 w-4" /> Abrir fonte</Button> : null}{getContactUrl(viewing) ? <Button onClick={() => contactLead(viewing)}><ExternalLink className="h-4 w-4" /> Abrir e marcar envio</Button> : null}</div></div>
        </div> : null}
      </Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir lead" description="Esta ação remove o lead e o histórico vinculado." size="md"><p className="text-sm text-zinc-400">Tem certeza que deseja excluir <span className="font-medium text-white">{deleteTarget?.company_name}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteLead.isPending}>{deleteLead.isPending ? "Excluindo..." : "Excluir definitivamente"}</Button></div></Dialog>
      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} title="Limpar todos os leads" description="Clientes e projetos permanecem, mas leads e históricos vinculados serão removidos." size="md"><p className="text-sm leading-relaxed text-zinc-400">Esta ação exclui todos os <strong className="text-white">{leadsQuery.data?.length || 0} leads</strong> da organização atual. Use-a antes de iniciar uma nova lista de prospecção.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setClearOpen(false)}>Cancelar</Button><Button variant="danger" onClick={clearAll} disabled={clearing}>{clearing ? "Limpando..." : "Excluir todos os leads"}</Button></div></Dialog>
    </>
  );
}
