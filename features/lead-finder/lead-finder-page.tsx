"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Bot, Boxes, Check, ExternalLink, Globe, Loader2, MessageCircle, PackageSearch, Phone, Search, ShoppingBag, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useOrganization } from "@/features/auth/organization-provider";
import { cn } from "@/lib/utils";
import type { FinderService } from "./build-lead";

type ResultLead = {
  id: string; company_name: string; city: string | null; state: string | null; phone: string | null; whatsapp: string | null;
  whatsapp_confirmed: boolean; website: string | null; marketplace_url: string | null; marketplace_listings: number | null;
};
type Result = { found: number; imported: ResultLead[]; existing: ResultLead[] };

const SERVICES: Array<{ value: FinderService; label: string; hint: string; icon: typeof Globe }> = [
  { value: "Site", label: "Site", hint: "Empresas locais no Google Maps", icon: Globe },
  { value: "Loja no Mercado Livre", label: "Loja no ML", hint: "Vendedores do Mercado Livre", icon: ShoppingBag },
  { value: "IA para WhatsApp", label: "Assistente de IA", hint: "Empresas que atendem por WhatsApp", icon: Bot },
  { value: "Logística", label: "Logística", hint: "Empresas locais", icon: Truck },
  { value: "Estoque", label: "Estoque", hint: "Empresas locais", icon: Boxes },
  { value: "Outro", label: "Outro", hint: "Especifique o serviço", icon: Sparkles },
];

function ResultRow({ lead }: { lead: ResultLead }) {
  const location = [lead.city, lead.state].filter(Boolean).join("/");
  return (
    <li className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Link href={`/leads?lead=${lead.id}`} className="font-medium text-zinc-100 hover:underline">{lead.company_name}</Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          {location ? <span>{location}</span> : null}
          {lead.whatsapp ? <span className={cn("inline-flex items-center gap-1", lead.whatsapp_confirmed ? "text-emerald-300" : "text-amber-300")}><MessageCircle className="h-3 w-3" />{lead.whatsapp} {lead.whatsapp_confirmed ? "· confirmado" : "· provável"}</span> : null}
          {lead.phone && lead.phone !== lead.whatsapp ? <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span> : null}
          {!lead.whatsapp && !lead.phone ? <span className="text-zinc-600">Sem telefone encontrado</span> : null}
          {lead.website ? <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" />{lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span> : null}
          {lead.marketplace_url ? <a href={lead.marketplace_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary-light hover:underline"><ExternalLink className="h-3 w-3" />Loja no ML{lead.marketplace_listings !== null ? ` · ${lead.marketplace_listings} anúncios` : ""}</a> : null}
        </div>
      </div>
      <Link href={`/leads?lead=${lead.id}`} className="shrink-0 text-xs text-primary-light hover:underline">Abrir ficha</Link>
    </li>
  );
}

export function LeadFinderPage() {
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const [service, setService] = useState<FinderService>("Site");
  const [serviceDetail, setServiceDetail] = useState("");
  const [niche, setNiche] = useState("");
  const [region, setRegion] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [websiteFilter, setWebsiteFilter] = useState<"all" | "with" | "without">("all");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const isMl = service === "Loja no Mercado Livre";

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (service === "Outro" && !serviceDetail.trim()) return toast.error("Especifique o serviço em “Outro”.");
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/lead-finder", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ service, serviceDetail, niche, region, quantity, websiteFilter: service === "Site" ? websiteFilter : "all" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível buscar leads");
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["leads", organizationId] });
      toast.success(`${data.imported.length} ${data.imported.length === 1 ? "lead novo" : "leads novos"} no Lynk`, { description: data.existing.length ? `${data.existing.length} já estavam cadastrados e não foram alterados.` : undefined });
    } catch (error) {
      toast.error("Busca não concluída", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Prospecção" title="Buscar leads" description="Escolha o serviço, o nicho e a região. O Lynk encontra as empresas, completa o contato e cria os leads com a mensagem pronta." />

      <Card className="mb-6">
        <form onSubmit={submit} className="space-y-5 p-4 sm:p-5">
          <div>
            <Label>Para qual serviço?</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6" role="radiogroup" aria-label="Serviço">
              {SERVICES.map((item) => {
                const Icon = item.icon;
                const active = service === item.value;
                return (
                  <button key={item.value} type="button" role="radio" aria-checked={active} aria-label={`${item.label}: ${item.hint}`} onClick={() => { setService(item.value); if (item.value === "Loja no Mercado Livre") setQuantity((value) => Math.min(value, 20)); }}
                    className={cn("flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition", active ? "border-primary-light/40 bg-primary/15" : "border-line bg-[#090909] hover:border-white/15")}>
                    <span className={cn("flex items-center gap-2 text-sm font-medium", active ? "text-white" : "text-zinc-300")}><Icon className={cn("h-4 w-4", active && "text-primary-light")} />{item.label}</span>
                    <span className="text-[11px] leading-tight text-zinc-500">{item.hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {service === "Outro" || isMl ? (
            <div>
              <Label htmlFor="service-detail">{service === "Outro" ? "Qual serviço? *" : "O que você oferece para a loja? (opcional)"}</Label>
              <Input id="service-detail" value={serviceDetail} onChange={(event) => setServiceDetail(event.target.value)} maxLength={120} placeholder={service === "Outro" ? "Ex.: automação de agendamento" : "Ex.: site próprio, gestão de anúncios, atendimento com IA"} />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto_auto]">
            <div>
              <Label htmlFor="niche">{isMl ? "Nicho / palavras-chave *" : "Nicho *"}</Label>
              <Input id="niche" value={niche} onChange={(event) => setNiche(event.target.value)} required minLength={2} placeholder={isMl ? "Ex.: autopeças, suplementos, moda praia" : "Ex.: clínica odontológica, pet shop"} />
            </div>
            <div>
              <Label htmlFor="region">{isMl ? "Região (opcional)" : "Cidade / região *"}</Label>
              <Input id="region" value={region} onChange={(event) => setRegion(event.target.value)} required={!isMl} placeholder="Ex.: Curitiba, PR" />
            </div>
            {service === "Site" ? (
              <div>
                <Label htmlFor="website-filter">Site atual</Label>
                <Select id="website-filter" value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value as typeof websiteFilter)}>
                  <option value="all">Todas</option>
                  <option value="without">Sem site</option>
                  <option value="with">Com site</option>
                </Select>
              </div>
            ) : <div className="hidden md:block" />}
            <div>
              <Label htmlFor="quantity">Quantidade</Label>
              <Select id="quantity" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}>
                {[10, 20, ...(isMl ? [] : [30])].map((value) => <option key={value} value={value}>{value}</option>)}
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-relaxed text-zinc-500">
              {isMl
                ? "Lojas encontradas pela busca web no Mercado Livre. O ML não divulga o contato dos vendedores: o telefone vem do Google Maps quando o nome confere, e o WhatsApp do site oficial."
                : "Empresas do Google Maps. WhatsApp “confirmado” = link wa.me no site da empresa; celular sem esse link fica como “provável”."}
            </p>
            <Button type="submit" disabled={loading} className="shrink-0">{loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</> : <><Search className="h-4 w-4" /> Buscar leads</>}</Button>
          </div>
        </form>
      </Card>

      {loading ? <Card className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted"><PackageSearch className="h-6 w-6 text-primary-light" />Procurando empresas e completando os contatos. Pode levar até 1 minuto.</Card> : null}

      {result ? (
        <Card>
          <header className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
            <Check className="h-4 w-4 text-emerald-300" />
            <h2 className="text-sm font-semibold text-white">{result.imported.length} novos leads</h2>
            <span className="text-xs text-zinc-500">· {result.found} encontrados{result.existing.length ? ` · ${result.existing.length} já estavam no Lynk` : ""}</span>
            <Link href="/leads" className="ml-auto text-xs text-primary-light hover:underline">Ver todos em Leads</Link>
          </header>
          {result.imported.length ? <ul className="divide-y divide-line">{result.imported.map((lead) => <ResultRow key={lead.id} lead={lead} />)}</ul> : <p className="px-4 py-6 text-center text-sm text-zinc-500">Nenhum lead novo nesta busca. Tente outro nicho ou região.</p>}
          {result.existing.length ? (
            <details className="border-t border-line">
              <summary className="cursor-pointer px-4 py-3 text-xs text-zinc-500">Já cadastrados (não alterados)</summary>
              <ul className="divide-y divide-line">{result.existing.map((lead) => <ResultRow key={lead.id} lead={lead} />)}</ul>
            </details>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}
