"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { projectSchema, type ProjectFormValues } from "@/lib/validations/project";
import type { Client, Project } from "@/types";

export function ProjectForm({ project, clients, onSubmit, onCancel, loading }: {
  project?: Project | null;
  clients: Client[];
  onSubmit: (values: ProjectFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      client_id: project?.client_id || "",
      name: project?.name || "",
      category: project?.category || "",
      status: project?.status || "Briefing",
      briefing: project?.briefing || "",
      preview_url: project?.preview_url || "",
      production_url: project?.production_url || "",
      repository_url: project?.repository_url || "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="project-client">Cliente *</Label><Select id="project-client" {...register("client_id")}><option value="">Selecione</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.company_name}</option>)}</Select>{errors.client_id ? <p className="mt-1 text-xs text-red-400">{errors.client_id.message}</p> : null}</div>
        <div><Label htmlFor="project-status">Status</Label><Select id="project-status" {...register("status")}><option>Briefing</option><option>Produção</option><option>Aprovação</option><option>Publicado</option></Select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="project-name">Nome do projeto *</Label><Input id="project-name" placeholder="Landing Page - Empresa" {...register("name")} />{errors.name ? <p className="mt-1 text-xs text-red-400">{errors.name.message}</p> : null}</div><div><Label htmlFor="category">Categoria</Label><Input id="category" placeholder="Restaurante, clínica..." {...register("category")} /></div></div>
      <div><Label htmlFor="briefing">Briefing</Label><Textarea id="briefing" className="min-h-36" placeholder="Objetivo, público, diferenciais, seções e referências..." {...register("briefing")} /></div>
      <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="preview_url">URL de preview</Label><Input id="preview_url" type="url" placeholder="https://..." {...register("preview_url")} /></div><div><Label htmlFor="production_url">URL publicada</Label><Input id="production_url" type="url" placeholder="https://..." {...register("production_url")} /></div><div><Label htmlFor="repository_url">Repositório</Label><Input id="repository_url" type="url" placeholder="https://github.com/..." {...register("repository_url")} /></div></div>
      {(errors.preview_url || errors.production_url || errors.repository_url) ? <p className="text-xs text-red-400">Preencha somente URLs completas, começando com https://</p> : null}
      <div className="flex justify-end gap-2 border-t border-line pt-5"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando..." : project ? "Salvar alterações" : "Criar projeto"}</Button></div>
    </form>
  );
}
