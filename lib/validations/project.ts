import { z } from "zod";

export const projectSchema = z.object({
  client_id: z.string().min(1, "Escolha o cliente"),
  name: z.string().trim().min(2, "Informe o nome do projeto"),
  category: z.string().trim().optional(),
  status: z.enum(["Briefing", "Produção", "Aprovação", "Publicado"]),
  briefing: z.string().trim().optional(),
  preview_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  production_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
  repository_url: z.string().trim().url("URL inválida").or(z.literal("")).optional(),
});

export type ProjectFormValues = z.infer<typeof projectSchema>;
