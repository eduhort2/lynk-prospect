import { z } from "zod";

export const prospectingRequestSchema = z.object({
  region: z.string().trim().min(3, "Informe uma região").max(120),
  niche: z.string().trim().min(2, "Informe um nicho").max(100),
  quantity: z.coerce.number().int().min(1).max(100),
  websiteFilter: z.enum(["all", "with", "without"]).default("all"),
});

export type ProspectingRequest = z.infer<typeof prospectingRequestSchema>;
