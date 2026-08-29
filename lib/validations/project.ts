import { z } from "zod";

export const PROJECT_STATUSES = [
  "Aguardando kickoff",
  "Planejamento",
  "Design",
  "Desenvolvimento",
  "Revisão interna",
  "Aguardando cliente",
  "Homologação",
  "Concluído",
  "Manutenção",
  "Pausado",
  "Cancelado",
] as const;

export const projectSchema = z.object({
  client_id: z.string().min(1, "Escolha o cliente"),
  name: z.string().trim().min(2, "Informe o nome do projeto"),
  category: z.string().trim().optional(),
  status: z.enum(PROJECT_STATUSES),
  briefing: z.string().trim().optional(),
  preview_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  production_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  repository_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  description: z.string().trim().optional(),
  scope: z.string().trim().optional(),
  starts_at: z.string().optional(),
  due_date: z.string().optional(),
  delivered_at: z.string().optional(),
  contracted_value: z.coerce.number().min(0).optional(),
  observations: z.string().trim().optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
