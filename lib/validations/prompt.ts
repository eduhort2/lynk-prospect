import { z } from "zod";

export const promptSchema = z.object({
  company_name: z.string().trim().min(2, "Informe o nome da empresa"),
  segment: z.string().trim().min(2, "Informe o segmento"),
  city: z.string().trim().optional(),
  differentiators: z.string().trim().min(2, "Informe ao menos um diferencial"),
  instagram: z.string().trim().optional(),
  objective: z.string().trim().min(2, "Informe o objetivo da landing page"),
});

export type PromptFormValues = z.infer<typeof promptSchema>;
