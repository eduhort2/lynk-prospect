"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
import { LEAD_STATUSES, type Lead, type OrganizationMember } from "@/types";

const defaultValues: LeadFormValues = {
  company_name: "",
  contact_name: "",
  phone: "",
  whatsapp: "",
  email: "",
  segment: "",
  city: "",
  state: "",
  instagram: "",
  website: "",
  has_website: false,
  source: "",
  priority: "Média",
  status: "Novo",
  responsible_user: "",
  message: "",
};

export function LeadForm({
  lead,
  members,
  onSubmit,
  onCancel,
  loading,
}: {
  lead?: Lead | null;
  members: OrganizationMember[];
  onSubmit: (values: LeadFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const values = lead ? {
    company_name: lead.company_name,
    contact_name: lead.contact_name || "",
    phone: lead.phone || "",
    whatsapp: lead.whatsapp || "",
    email: lead.email || "",
    segment: lead.segment || "",
    city: lead.city || "",
    state: lead.state || "",
    instagram: lead.instagram || "",
    website: lead.website || "",
    has_website: lead.has_website,
    source: lead.source || "",
    priority: lead.priority,
    status: lead.status,
    responsible_user: lead.responsible_user || "",
    message: lead.message || "",
  } : defaultValues;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: values,
  });
  const hasWebsite = watch("has_website");

  const field = (name: keyof LeadFormValues, label: string, placeholder?: string, type = "text") => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} {...register(name)} />
      {errors[name] ? <p className="mt-1 text-xs text-red-400">{errors[name]?.message as string}</p> : null}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("company_name", "Empresa *", "Ex.: Clínica Horizonte")}
        {field("contact_name", "Contato", "Nome da pessoa")}
        {field("whatsapp", "WhatsApp", "+55 41 99999-9999")}
        {field("phone", "Telefone", "+55 41 3333-3333")}
        {field("email", "E-mail", "contato@empresa.com", "email")}
        {field("segment", "Segmento", "Ex.: Restaurante")}
        {field("city", "Cidade", "Curitiba")}
        {field("state", "UF", "PR")}
        {field("instagram", "Instagram", "@empresa")}
        {field("source", "Origem", "Google Maps, indicação...")}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div><Label htmlFor="priority">Prioridade</Label><Select id="priority" {...register("priority")}><option>Baixa</option><option>Média</option><option>Alta</option></Select></div>
        <div><Label htmlFor="status">Status</Label><Select id="status" {...register("status")}>{LEAD_STATUSES.map((status) => <option key={status}>{status}</option>)}</Select></div>
        <div><Label htmlFor="responsible_user">Responsável</Label><Select id="responsible_user" {...register("responsible_user")}><option value="">Usuário atual</option>{members.map((member) => <option key={member.user_id} value={member.user_id}>{member.profile?.name || member.profile?.email}</option>)}</Select></div>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-line bg-[#090909] p-3 text-sm text-zinc-300">
        <input type="checkbox" className="h-4 w-4 accent-primary" {...register("has_website")} />
        A empresa já possui site
      </label>

      {hasWebsite ? field("website", "Site atual", "https://empresa.com.br", "url") : null}

      <div>
        <Label htmlFor="message">Observações e mensagem de contato</Label>
        <Textarea id="message" placeholder="Registre contexto, abordagem e próximos passos..." {...register("message")} />
      </div>

      <div className="flex justify-end gap-2 border-t border-line pt-5">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : lead ? "Salvar alterações" : "Criar lead"}</Button>
      </div>
    </form>
  );
}
