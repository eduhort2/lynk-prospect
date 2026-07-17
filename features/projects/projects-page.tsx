"use client";

import { ExternalLink, FolderKanban, GitBranch, Globe2, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ProjectForm } from "@/components/forms/project-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useClients } from "@/features/clients/use-clients";
import type { ProjectFormValues } from "@/lib/validations/project";
import { formatDate } from "@/lib/utils";
import type { Project, ProjectStatus } from "@/types";
import { useCreateProject, useDeleteProject, useProjects, useUpdateProject } from "./use-projects";

const tones: Record<ProjectStatus, "gray" | "blue" | "amber" | "green"> = { Briefing: "gray", Produção: "blue", Aprovação: "amber", Publicado: "green" };

export function ProjectsPage() {
  const projectsQuery = useProjects();
  const clientsQuery = useClients();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "">("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const filtered = useMemo(() => (projectsQuery.data || []).filter((project) => (!status || project.status === status) && [project.name, project.category, project.client?.company_name].some((value) => (value || "").toLowerCase().includes(search.toLowerCase()))), [projectsQuery.data, search, status]);

  async function submit(values: ProjectFormValues) {
    try {
      if (editing) await updateProject.mutateAsync({ id: editing.id, values });
      else await createProject.mutateAsync(values);
      toast.success(editing ? "Projeto atualizado" : "Projeto criado");
      setEditing(null); setFormOpen(false);
    } catch (error) { toast.error("Não foi possível salvar", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try { await deleteProject.mutateAsync(deleteTarget.id); toast.success("Projeto excluído"); setDeleteTarget(null); }
    catch (error) { toast.error("Não foi possível excluir", { description: error instanceof Error ? error.message : "Tente novamente." }); }
  }

  return (
    <>
      <PageHeader eyebrow="Produção" title="Projetos" description="Controle briefing, produção, aprovação e publicação das landing pages." actions={<Button onClick={() => { setEditing(null); setFormOpen(true); }} disabled={!clientsQuery.data?.length}><Plus className="h-4 w-4" /> Novo projeto</Button>} />
      {!clientsQuery.isLoading && !clientsQuery.data?.length ? <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-400/[.06] p-4 text-sm text-amber-200">Cadastre pelo menos um cliente antes de criar projetos.</div> : null}
      <Card className="mb-5"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-600" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar projeto ou cliente..." className="pl-10" /></div><Select className="sm:w-44" value={status} onChange={(event) => setStatus(event.target.value as ProjectStatus | "")}><option value="">Todos os status</option><option>Briefing</option><option>Produção</option><option>Aprovação</option><option>Publicado</option></Select></CardContent></Card>
      {projectsQuery.isLoading ? <Card className="flex min-h-72 items-center justify-center text-sm text-muted">Carregando projetos...</Card> : filtered.length ? <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">{filtered.map((project) => <Card key={project.id} className="group"><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><div><Badge tone={tones[project.status]}>{project.status}</Badge><h3 className="mt-3 font-medium text-zinc-100">{project.name}</h3><p className="mt-1 text-xs text-zinc-600">{project.client?.company_name} · {project.category || "Landing page"}</p></div><div className="flex"><Button variant="ghost" size="icon" onClick={() => { setEditing(project); setFormOpen(true); }} aria-label="Editar projeto"><Pencil className="h-3.5 w-3.5" /></Button><Button variant="ghost" size="icon" className="text-red-300" onClick={() => setDeleteTarget(project)} aria-label="Excluir projeto"><Trash2 className="h-3.5 w-3.5" /></Button></div></div><p className="mt-4 line-clamp-3 min-h-[3.75rem] text-xs leading-relaxed text-zinc-500">{project.briefing || "Briefing ainda não preenchido."}</p><div className="mt-5 flex items-center justify-between border-t border-line pt-4"><span className="text-[10px] text-zinc-600">Criado em {formatDate(project.created_at)}</span><div className="flex gap-1">{project.preview_url ? <a href={project.preview_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-white" title="Abrir preview"><ExternalLink className="h-3.5 w-3.5" /></a> : null}{project.production_url ? <a href={project.production_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-white" title="Abrir site publicado"><Globe2 className="h-3.5 w-3.5" /></a> : null}{project.repository_url ? <a href={project.repository_url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-zinc-500 hover:bg-white/[.05] hover:text-white" title="Abrir repositório"><GitBranch className="h-3.5 w-3.5" /></a> : null}</div></div></CardContent></Card>)}</div> : <Card><EmptyState icon={FolderKanban} title="Nenhum projeto encontrado" description={search || status ? "Ajuste os filtros para visualizar outros projetos." : "Crie o primeiro projeto de landing page para um cliente."} action={!search && !status && clientsQuery.data?.length ? <Button onClick={() => setFormOpen(true)}>Criar projeto</Button> : undefined} /></Card>}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Editar projeto" : "Novo projeto"} description="Organize o briefing e as URLs em cada etapa." size="xl"><ProjectForm key={editing?.id || "new"} project={editing} clients={clientsQuery.data || []} onSubmit={submit} onCancel={() => setFormOpen(false)} loading={createProject.isPending || updateProject.isPending} /></Dialog>
      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Excluir projeto" description="O registro será removido permanentemente." size="md"><p className="text-sm text-zinc-400">Excluir <span className="font-medium text-white">{deleteTarget?.name}</span>?</p><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={confirmDelete} disabled={deleteProject.isPending}>Excluir</Button></div></Dialog>
    </>
  );
}
