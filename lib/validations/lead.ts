import { z } from "zod";
import { LEAD_STATUSES, SUGGESTED_SERVICES } from "@/types";

const optionalText = z.string().trim().optional();

/** Cadastro enxuto: apenas o nome da empresa é obrigatório. */
export const leadSchema = z.object({
  company_name: z.string().trim().min(1, "Informe o nome da empresa"),
  contact_name: optionalText,
  segment: optionalText,
  city: optionalText,
  state: z.string().trim().max(2, "Use a sigla do estado").optional(),
  phone: optionalText,
  email: z.string().trim().email("E-mail inválido").or(z.literal("")).optional(),
  website: optionalText,
  whatsapp: optionalText,
  whatsapp_confirmed: z.boolean(),
  contact_link: optionalText,
  suggested_service: z.enum(SUGGESTED_SERVICES).or(z.literal("")).optional(),
  suggested_service_detail: optionalText,
  marketplace_url: optionalText,
  marketplace_listings: z.string().trim().regex(/^\d*$/, "Use apenas números").optional(),
  differentiators: optionalText,
  landing_page_opportunity: optionalText,
  public_source: optionalText,
  message: optionalText,
  observations: optionalText,
  status: z.enum(LEAD_STATUSES),
});

export type LeadFormValues = z.infer<typeof leadSchema>;
