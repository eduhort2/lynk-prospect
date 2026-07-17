import { z } from "zod";
import { LEAD_STATUSES } from "@/types";

export const leadSchema = z.object({
  company_name: z.string().trim().min(2, "Informe o nome da empresa"),
  contact_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  whatsapp: z.string().trim().optional(),
  email: z.string().trim().email("E-mail inválido").or(z.literal("")).optional(),
  segment: z.string().trim().optional(),
  city: z.string().trim().optional(),
  state: z.string().trim().max(2, "Use a sigla do estado").optional(),
  instagram: z.string().trim().optional(),
  website: z.string().trim().optional(),
  has_website: z.boolean(),
  source: z.string().trim().optional(),
  priority: z.enum(["Baixa", "Média", "Alta"]),
  status: z.enum(LEAD_STATUSES),
  responsible_user: z.string().optional(),
  message: z.string().trim().optional(),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
