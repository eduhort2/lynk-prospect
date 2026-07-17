import { z } from "zod";

export const taskSchema = z.object({
  title: z.string().trim().min(2, "Informe o título"),
  description: z.string().trim().optional(),
  scheduled_at: z.string().min(1, "Informe a data e o horário"),
  lead_id: z.string().optional(),
  user_id: z.string().min(1, "Escolha o responsável"),
  status: z.enum(["pendente", "concluído", "cancelado"]),
});

export type TaskFormValues = z.infer<typeof taskSchema>;
