"use client";

import { Mail, Pencil, Phone, Plus, Search, Trash2, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ClientForm } from "@/components/forms/client-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { useLeads } from "@/features/leads/use-leads";
import type { ClientFormValues } from "@/lib/validations/client";
import { formatDate, initials } from "@/lib/utils";
import type { Client } from "@/types";
import { useClients, useCreateClient, useDeleteClient, useUpdateClient } from "./use-clients";

export function ClientsPage() {
  const clientsQuery = useClients();
  const leadsQuery = useLeads();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Client | null>(null);
  const filtered = useMemo(() => (clientsQuery.data || []).filter((client) => [client.company_name, client.contact_name, client.email, client.phone].some((value) => (value || "").toLowerCase().includes(search.toLowerCase()))), [clientsQuery.data, search]);

  async function submit(values: ClientFormValues) {
    try {
      if (editing) await updateClient.mutateAsync({ id: editing.id, values });
      else await createClient.mutateAsync(values);
      toast.success(editing ? "Cliente atualizado" : "Cliente criado");
      setEditing(null); setFormOpen(false);
    } catch (error) { toast.error("Não foi possível salvar", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteClient.mutateAsync(deleteTarget.id); toast.success("Cliente excluído"); setDeleteTarget(null); }
    catch (error) { toast.error("Não foi possível excluir", { description: error instanceof Error ? error.message : "Remova os projetos vinculados antes de excluir." }); }
  }

  return (
    <>
      <PageHeader eyebrow="Relacionamento" title="Clientes" description="Empresas fechadas e prontas para receber projetos da LYNK." actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Novo cliente</Button>} />
      <Card className="mb-5"><CardContent className="p-4"><div className="relative max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente..." className="pl-10" /></div></CardContent></Card>
      {clientsQuery.isLoading ? <Card className="flex min-h-72 items-center justify-center text-sm text-muted">Carregando clientes...</Card> : filtered.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((client) => <Card key={client.id} className="group"><CardContent className="p-5"><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-xs font-semibold text-primary-light">{initials(client.company_name)}</div><div><h3 className="font-medium text-zinc-100">{client.company_name}</h3><p className="mt-1 text-xs text-zinc-600">Cliente desde {formatDate(client.created_at)}</p></div></div><div className="flex opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><Button variant="ghost" size="icon" onClick={() => { setEditing(client); setFormOpen(true); }} aria-label="Editar cliente"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="text-red-300" onClick={() => setDeleteTarget(client)} aria-label="Excluir cliente"><Trash2 className="h-3.5 w-3.5" /></Button></div></div><div className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-zinc-500"><p className="flex items-center gap-2"><UsersRound className="h-3.5 w-3.5" /> {client.contact_name || "Contato não informado"}</p><p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {client.phone || "Telefone não informado"}</p><p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {client.email || "E-mail não informado"}</p></div></CardContent></Card>)}
        </div>
      ) : <Card><EmptyState icon={UsersRound} title="Nenhum cliente encontrado" description={search ? "A busca não encontrou clientes." : "Ao fechar um lead, o cliente é criado automaticamente. Você também pode cadastrar manualmente."} action={!search ? <Button onClick={() => setFormOpen(true)}>Criar cliente</Button> : undefined} /></Card>}

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar cliente" : "Novo cliente"}><ClientForm key={editing?.id || "new"} client={editing} leads={leadsQuery.data || []} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createClient.isPending || updateClient.isPending} /></Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir cliente" description="Projetos vinculados impedem a exclusão para proteger os dados." size="md"><p className="text-sm text-zinc-400">Excluir <span className="font-medium text-white">{deleteTarget?.company_name}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteClient.isPending}>Excluir</Button></div></Dialog>
    </>
  );
}
