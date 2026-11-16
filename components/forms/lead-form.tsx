"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { StageOptions } from "@/features/leads/stage-options";
import { leadSchema, type LeadFormValues } from "@/lib/validations/lead";
import { SUGGESTED_SERVICES, type Lead } from "@/types";

const defaultValues: LeadFormValues = {
  company_name: "",
  contact_name: "",
  segment: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  website: "",
  whatsapp: "",
  whatsapp_confirmed: false,
  contact_link: "",
  suggested_service: "",
  suggested_service_detail: "",
  marketplace_url: "",
  marketplace_listings: "",
  differentiators: "",
  landing_page_opportunity: "",
  public_source: "",
  message: "",
  observations: "",
  status: "Novo",
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[.16em] text-primary-light">{title}</legend>
      {children}
    </fieldset>
  );
}

export function LeadForm({
  lead,
  onSubmit,
  onCancel,
  loading,
}: {
  lead?: Lead | null;
  onSubmit: (values: LeadFormValues) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}) {
  const values: LeadFormValues = lead ? {
    company_name: lead.company_name,
    contact_name: lead.contact_name || "",
    segment: lead.segment || "",
    city: lead.city || "",
    state: lead.state || "",
    phone: lead.phone || "",
    email: lead.email || "",
    website: lead.website || "",
    whatsapp: lead.whatsapp || "",
    whatsapp_confirmed: Boolean(lead.whatsapp_confirmed),
    contact_link: lead.contact_link || "",
    suggested_service: lead.suggested_service || "",
    suggested_service_detail: lead.suggested_service_detail || "",
    marketplace_url: lead.marketplace_url || "",
    marketplace_listings: lead.marketplace_listings != null ? String(lead.marketplace_listings) : "",
    differentiators: lead.differentiators || "",
    landing_page_opportunity: lead.landing_page_opportunity || "",
    public_source: lead.public_source || "",
    message: lead.message || "",
    observations: lead.observations || "",
    status: lead.status,
  } : defaultValues;

  const { register, handleSubmit, formState: { errors }, watch } = useForm<LeadFormValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: values,
  });
  const whatsapp = watch("whatsapp");
  const confirmed = watch("whatsapp_confirmed");
  const service = watch("suggested_service");
  // Sem número, não existe WhatsApp confirmado.
  const submit = (data: LeadFormValues) => onSubmit({ ...data, whatsapp_confirmed: Boolean(data.whatsapp?.trim()) && data.whatsapp_confirmed });

  const field = (name: keyof LeadFormValues, label: string, placeholder?: string, type = "text") => (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} placeholder={placeholder} {...register(name)} />
      {errors[name] ? <p className="mt-1 text-xs text-red-400">{errors[name]?.message as string}</p> : null}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-7">
      <Section title="Empresa">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("company_name", "Empresa *", "Ex.: Distribuidora Horizonte")}
          {field("segment", "Segmento", "Ex.: Distribuidora de bebidas")}
          <div className="grid grid-cols-[1fr_88px] gap-3">
            {field("city", "Cidade", "Curitiba")}
            {field("state", "UF", "PR")}
          </div>
          {field("contact_name", "Contato", "Nome da pessoa (opcional)")}
        </div>
      </Section>

      <Section title="Canais">
        <div className="grid gap-4 sm:grid-cols-2">
          {field("phone", "Telefone comercial", "+55 41 3333-3333")}
          {field("email", "E-mail", "contato@empresa.com", "email")}
          {field("website", "Site", "https://empresa.com.br")}
          {field("contact_link", "Link oficial de contato", "https://wa.me/55... ou outro link oficial")}
        </div>
        <div className="rounded-xl border border-line bg-[#090909] p-3">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            {field("whatsapp", "WhatsApp", "+55 41 99999-9999")}
            <label className="flex items-center gap-2 pb-2.5 text-sm text-zinc-300">
              <input type="checkbox" className="h-4 w-4 accent-primary" {...register("whatsapp_confirmed")} />
              WhatsApp confirmado
            </label>
          </div>
          {confirmed && !whatsapp?.trim() ? <p className="mt-2 text-xs text-amber-300">Informe o número para registrar o WhatsApp como confirmado.</p> : null}
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">Marque só quando o número foi conferido como WhatsApp da empresa. Telefone comum não libera o botão “Abrir WhatsApp”.</p>
        </div>
      </Section>

      <Section title="Abordagem">
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="suggested_service">Serviço sugerido</Label><Select id="suggested_service" {...register("suggested_service")}><option value="">Não definido</option>{SUGGESTED_SERVICES.map((item) => <option key={item}>{item}</option>)}</Select></div>
          <div><Label htmlFor="status">Etapa</Label><Select id="status" {...register("status")}><StageOptions current={lead?.status} /></Select></div>
        </div>
        {service === "Outro" || service === "Loja no Mercado Livre" ? field("suggested_service_detail", service === "Outro" ? "Qual serviço?" : "O que oferecer para a loja", service === "Outro" ? "Ex.: automação de agendamento" : "Ex.: site próprio, gestão de anúncios") : null}
        {service === "Loja no Mercado Livre" || lead?.marketplace_url ? (
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            {field("marketplace_url", "Link da loja no Mercado Livre", "https://www.mercadolivre.com.br/loja/...")}
            {field("marketplace_listings", "Anúncios", "Ex.: 350")}
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <div><Label htmlFor="differentiators">Sinal observado</Label><Textarea id="differentiators" className="min-h-20" placeholder="Ex.: pedidos só por telefone, sem site, estoque em planilha..." {...register("differentiators")} /></div>
          <div><Label htmlFor="landing_page_opportunity">Oportunidade comercial</Label><Textarea id="landing_page_opportunity" className="min-h-20" placeholder="O que o serviço resolveria para a empresa" {...register("landing_page_opportunity")} /></div>
        </div>
        {field("public_source", "Fonte pública", "Link onde o sinal foi observado")}
        <div><Label htmlFor="message">Mensagem personalizada</Label><Textarea id="message" placeholder="Mensagem para o primeiro contato" {...register("message")} /></div>
        <div><Label htmlFor="observations">Notas de acompanhamento</Label><Textarea id="observations" className="min-h-20" placeholder="Histórico, objeções, próximos passos..." {...register("observations")} /></div>
      </Section>

      <div className="sticky bottom-0 -mx-4 -mb-4 flex justify-end gap-2 border-t border-line bg-[#0b0b0b]/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5">
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>{loading ? "Salvando..." : lead ? "Salvar alterações" : "Criar lead"}</Button>
      </div>
    </form>
  );
}
