"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
      legal_name: client?.legal_name || "",
      tax_id: client?.tax_id || "",
      contact_name: client?.contact_name || "",
      phone: client?.phone || "",
      whatsapp: client?.whatsapp || "",
      email: client?.email || "",
      address: client?.address || "",
      observations: client?.observations || "",
      lead_id: client?.lead_id || "",
    },
  });
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label htmlFor="client-company">Nome fantasia *</Label><Input id="client-company" {...register("company_name")} />{errors.company_name ? <p className="mt-1 text-xs text-red-400">{errors.company_name.message}</p> : null}</div>
        <div><Label htmlFor="client-legal">Razão social</Label><Input id="client-legal" {...register("legal_name")} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="client-tax">CPF / CNPJ</Label><Input id="client-tax" {...register("tax_id")} /></div><div><Label htmlFor="client-contact">Responsável</Label><Input id="client-contact" {...register("contact_name")} /></div></div>
      <div className="grid gap-4 sm:grid-cols-3"><div><Label htmlFor="client-phone">Telefone</Label><Input id="client-phone" {...register("phone")} /></div><div><Label htmlFor="client-whatsapp">WhatsApp</Label><Input id="client-whatsapp" {...register("whatsapp")} /></div><div><Label htmlFor="client-email">E-mail</Label><Input id="client-email" type="email" {...register("email")} />{errors.email ? <p className="mt-1 text-xs text-red-400">{errors.email.message}</p> : null}</div></div>
      <div><Label htmlFor="client-address">Endereço</Label><Input id="client-address" {...register("address")} /></div>
      <div><Label htmlFor="client-lead">Lead de origem</Label><Select id="client-lead" {...register("lead_id")}><option value="">Sem vínculo</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.company_name}</option>)}</Select></div>
      <div><Label htmlFor="client-observations">Observações</Label><Textarea id="client-observations" className="min-h-24" {...register("observations")} /></div>
      <div className="flex justify-end gap-2 border-t border-line pt-5"><Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={loading}>{loading ? "Salvando..." : client ? "Salvar alterações" : "Criar cliente"}</Button></div>
    </form>
  );
}
