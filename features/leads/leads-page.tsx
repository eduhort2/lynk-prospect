"use client";

import { Download, FileSpreadsheet, Plus, Search, Trash2, Upload } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { LeadForm } from "@/components/forms/lead-form";
import { LeadsTable } from "@/components/tables/leads-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import { Select } from "@/components/ui/select";
import type { LeadFormValues } from "@/lib/validations/lead";
import { SUGGESTED_SERVICES, type Lead } from "@/types";
import { useFollowUps } from "./follow-ups";
import { parseProspectingWorkbook } from "./importer";
import { LeadDetail } from "./lead-detail";
import { PIPELINE_STAGES, type StageStatus } from "./stages";
import { useCreateLead, useDeleteLead, useImportLeads, useUpdateLead } from "./use-leads";
import { useLead, useLeadCount, useLeadsPage, usePageSize } from "./use-lead-pages";
import { useContactLead, type ContactChannel } from "./use-contact-lead";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Tente novamente.";
}

export function LeadsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const followUps = useFollowUps();
  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const deleteLead = useDeleteLead();
  const importLeads = useImportLeads();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState<StageStatus | "">("");
  const [service, setService] = useState("");
  // Por padrão a lista mostra só quem dá para chamar por WhatsApp ou Instagram.
  const [channel, setChannel] = useState<"messageable" | "all">("messageable");
  const contactLead = useContactLead();
  const [editing, setEditing] = useState<Lead | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Lead | null>(null);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = usePageSize();
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Busca no servidor com pequeno atraso para não consultar a cada tecla.
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  // Mudou filtro ou tamanho de página: volta para a primeira página.
  useEffect(() => { setPage(1); }, [debouncedSearch, stage, service, channel, pageSize]);

  const leadsQuery = useLeadsPage({ search: debouncedSearch, stage, service, channel, page, pageSize });
  const countQuery = useLeadCount();
  const rows = leadsQuery.data?.rows || [];
  const filteredTotal = leadsQuery.data?.total ?? 0;
  const total = countQuery.data ?? 0;

  // Se a página atual ficou vazia (ex.: após excluir), volta uma página.
  useEffect(() => {
    if (!leadsQuery.isFetching && page > 1 && filteredTotal > 0 && rows.length === 0) setPage(Math.ceil(filteredTotal / pageSize));
  }, [filteredTotal, leadsQuery.isFetching, page, pageSize, rows.length]);

  // A ficha aberta fica na URL (?lead=id) para a Agenda e o Pipeline abrirem direto.
  const viewingId = searchParams.get("lead");
  const viewingQuery = useLead(viewingId);
  const viewing = viewingQuery.data || null;

  function openLead(lead: Lead) { router.push(`${pathname}?lead=${lead.id}`, { scroll: false }); }
  function closeLead() { router.replace(pathname, { scroll: false }); }

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(lead: Lead) { setEditing(lead); setFormOpen(true); }

  /** Atalho da lista: abre a conversa com a mensagem salva e move o lead para "Contatado". */
  function openConversation(lead: Lead, channel: ContactChannel) {
    void contactLead.contact(lead, channel);
  }

  async function submit(values: LeadFormValues) {
    try {
      if (editing) {
        await updateLead.mutateAsync({ id: editing.id, values, previousStatus: editing.status });
        toast.success("Lead atualizado");
      } else {
        const created = await createLead.mutateAsync(values);
        toast.success("Lead cadastrado");
        openLead(created);
      }
      setFormOpen(false);
      setEditing(null);
    } catch (error) {
      toast.error("Não foi possível salvar o lead", { description: errorMessage(error) });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await deleteLead.mutateAsync(deleteTarget.id);
      toast.success("Lead excluído");
      if (viewingId === deleteTarget.id) closeLead();
      setDeleteTarget(null);
    } catch (error) {
      toast.error("Não foi possível excluir", { description: errorMessage(error) });
    }
  }

  async function clearAll() {
    setClearing(true);
    try {
      const response = await fetch("/api/leads/clear", { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível limpar os leads");
      setPage(1);
      await Promise.all([leadsQuery.refetch(), countQuery.refetch()]);
      setClearOpen(false);
      toast.success(`${data.deleted} leads removidos`);
    } catch (error) {
      toast.error("Limpeza não concluída", { description: errorMessage(error) });
    } finally { setClearing(false); }
  }

  async function handleImport(file?: File) {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const parsed = parseProspectingWorkbook(workbook, file.name);
      if (!parsed.rows.length) throw new Error("Nenhum lead válido foi encontrado na planilha");
      // Importação apenas grava os leads. Nenhuma mensagem é enviada automaticamente.
      const result = await importLeads.mutateAsync(parsed.rows);
      toast.success(`${result.imported} ${result.imported === 1 ? "lead novo importado" : "leads novos importados"}`, {
        description: `${result.skipped} já existentes preservados sem alteração · aba ${parsed.sheetName}${parsed.ignoredRows ? ` · ${parsed.ignoredRows} linhas sem empresa ignoradas` : ""}`,
      });
    } catch (error) {
      toast.error("Falha na importação", { description: errorMessage(error) });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function downloadModel() {
    const sheet = XLSX.utils.json_to_sheet([{
      Negócio: "Empresa Exemplo",
      Segmento: "Distribuidora",
      Cidade: "Curitiba",
      UF: "PR",
      Telefone: "+55 41 3333-3333",
      "WhatsApp confirmado": "",
      "E-mail": "contato@empresa.com.br",
      Site: "https://empresa.com.br",
      "Link para contato": "https://wa.me/5541999999999",
      "Serviço sugerido": "Estoque",
      "Sinal observado": "Pedidos e estoque controlados em planilha",
      "Oportunidade comercial": "Sistema de estoque integrado aos pedidos",
      "Fonte pública": "https://...",
      "Mensagem personalizada": "Mensagem pronta para o primeiro contato",
      Etapa: "Novo",
      Observações: "",
    }]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Leads");
    XLSX.writeFile(workbook, "modelo-leads-lynk.xlsx");
  }

  return (
    <>
      <PageHeader
        eyebrow="Prospecção"
        title="Leads"
        description="Cadastre ou importe empresas, revise a abordagem e acompanhe cada negociação."
        actions={<>
          <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={importLeads.isPending}><Upload className="h-4 w-4" /> {importLeads.isPending ? "Importando..." : "Importar planilha"}</Button>
          <Button onClick={openCreate}><Plus className="h-4 w-4" /> Novo lead</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" data-testid="import-input" onChange={(event) => handleImport(event.target.files?.[0])} />
        </>}
      />

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresa, cidade ou contato" className="pl-10" aria-label="Buscar leads" /></div>
          <div className="grid grid-cols-2 gap-2 md:flex">
            <Select className="col-span-2 md:col-auto md:min-w-52" value={channel} onChange={(event) => setChannel(event.target.value as "messageable" | "all")} aria-label="Filtrar por canal"><option value="messageable">Com WhatsApp ou Instagram</option><option value="all">Todos os leads</option></Select>
            <Select className="md:min-w-44" value={stage} onChange={(event) => setStage(event.target.value as StageStatus | "")} aria-label="Filtrar por etapa"><option value="">Todas as etapas</option>{PIPELINE_STAGES.map((item) => <option key={item.status} value={item.status}>{item.label}</option>)}</Select>
            <Select className="md:min-w-44" value={service} onChange={(event) => setService(event.target.value)} aria-label="Filtrar por serviço"><option value="">Todos os serviços</option>{SUGGESTED_SERVICES.map((item) => <option key={item}>{item}</option>)}<option value="none">Sem serviço</option></Select>
          </div>
        </div>
        {leadsQuery.isPending ? <div className="flex min-h-64 items-center justify-center text-sm text-muted">Carregando leads...</div> : leadsQuery.isError ? <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-red-300"><FileSpreadsheet className="h-6 w-6" /> {leadsQuery.error.message}<Button variant="secondary" onClick={() => leadsQuery.refetch()}>Tentar novamente</Button></div> : <div className={leadsQuery.isPlaceholderData ? "opacity-60 transition-opacity" : "transition-opacity"}><LeadsTable leads={rows} followUps={followUps.byLead} onOpen={openLead} onContact={openConversation} emptyHint={channel === "messageable" && total ? "Nenhum lead com WhatsApp ou Instagram nestes filtros. Troque para “Todos os leads” para ver os demais." : undefined} onEdit={openEdit} onDelete={setDeleteTarget} onCreate={openCreate} /></div>}
        {!leadsQuery.isLoading && !leadsQuery.isError && (filteredTotal || total) ? <div className="border-t border-line px-4 py-3 sm:px-5"><Pagination page={page} pageSize={pageSize} total={filteredTotal} onPageChange={(next) => { setPage(next); window.scrollTo({ top: 0, behavior: "smooth" }); }} onPageSizeChange={setPageSize} loading={leadsQuery.isFetching} /></div> : null}
        {!leadsQuery.isLoading && total ? <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 text-xs text-zinc-600"><span>{total} leads no total{filteredTotal !== total ? ` · ${filteredTotal} com os filtros atuais` : ""}</span><span className="flex gap-1"><Button variant="ghost" size="sm" className="text-zinc-500" onClick={downloadModel}><Download className="h-3.5 w-3.5" /> Modelo de planilha</Button><Button variant="ghost" size="sm" className="text-zinc-600 hover:text-red-300" onClick={() => setClearOpen(true)}><Trash2 className="h-3.5 w-3.5" /> Limpar leads</Button></span></div> : null}
        {!leadsQuery.isLoading && !total ? <div className="border-t border-line px-5 py-3 text-center text-xs"><Button variant="ghost" size="sm" className="text-zinc-500" onClick={downloadModel}><Download className="h-3.5 w-3.5" /> Baixar modelo de planilha</Button></div> : null}
      </Card>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar lead" : "Novo lead"} description="Só o nome da empresa é obrigatório." size="xl">
        <LeadForm key={editing?.id || "new"} lead={editing} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createLead.isPending || updateLead.isPending} />
      </Dialog>

      <Dialog open={Boolean(viewing) && !formOpen} onClose={closeLead} title={viewing?.company_name || "Ficha do lead"} description="Ficha da empresa" size="xl">
        {viewing ? <LeadDetail lead={viewing} followUp={followUps.byLead.get(viewing.id)} onEdit={() => openEdit(viewing)} /> : null}
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir lead" description="Esta ação remove o lead e o histórico vinculado." size="md"><p className="text-sm text-zinc-400">Tem certeza que deseja excluir <span className="font-medium text-white">{deleteTarget?.company_name}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteLead.isPending}>{deleteLead.isPending ? "Excluindo..." : "Excluir definitivamente"}</Button></div></Dialog>
      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} title="Limpar todos os leads" description="Clientes e projetos permanecem, mas leads e históricos vinculados serão removidos." size="md"><p className="text-sm leading-relaxed text-zinc-400">Esta ação exclui todos os <strong className="text-white">{total} leads</strong> da organização atual.</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setClearOpen(false)}>Cancelar</Button><Button variant="danger" onClick={clearAll} disabled={clearing}>{clearing ? "Limpando..." : "Excluir todos os leads"}</Button></div></Dialog>
    </>
  );
}
