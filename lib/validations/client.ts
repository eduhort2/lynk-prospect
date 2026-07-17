import { z } from "zod";

export const clientSchema = z.object({
  company_name: z.string().trim().min(2, "Informe o nome da empresa"),
  contact_name: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("E-mail inválido").or(z.literal("")).optional(),
  lead_id: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
