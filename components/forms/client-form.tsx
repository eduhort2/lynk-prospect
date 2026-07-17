"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { clientSchema, type ClientFormValues } from "@/lib/validations/client";
import type { Client, Lead } from "@/types";

export function ClientForm({ client, leads, onSubmit, onCancel, loading }: {
  client?: Client | null;
  leads: Lead[];
  onSubmit: (values: ClientFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      company_name: client?.company_name || "",
      contact_name: client?.contact_name || "",
      phone: client?.phone || "",
      email: client?.email || "",
      lead_id: client?.lead_id || "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div><Label htmlFor="client-company">Empresa *</Label><Input id="client-company" {...register("company_name")} />{errors.company_name ? <p className="mt-1 text-xs text-red-400">{errors.company_name.message}</p> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="client-contact">Contato</Label><Input id="client-contact" {...register("contact_name")} /></div><div><Label htmlFor="client-phone">Telefone</Label><Input id="client-phone" {...register("phone")} /></div></div>
      <div><Label htmlFor="client-email">E-mail</Label><Input id="client-email" type="email" {...register("email")} />{errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email.message}</p> : null}</div>
      <div><Label htmlFor="client-lead">Lead de origem</Label><Select id="client-lead" {...register("lead_id")}><option value="">Sem vínculo</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</Select></div>
      <div className="flex justify-end gap-2 border-t border-line pt-5"><Button variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando..." : client ? "Salvar alterações" : "Criar cliente"}</Button></div>
    </form>
  );
}
