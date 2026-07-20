"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ExternalLink, SearchCheck, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Select } from "@/components/ui/select";
import { useOrganization } from "@/features/auth/organization-provider";
import { useSubscription } from "@/features/billing/use-subscription";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Lead, ProspectingJob } from "@/types";

function sheetRows(leads: Lead[]) {
  return leads.map((lead, index) => ({
    ID: index + 1,
    Prioridade: lead.priority,
    Negócio: lead.company_name,
    Segmento: lead.segment || "",
    Bairro: lead.neighborhood || "",
    Telefone: lead.whatsapp || lead.phone || "",
    Instagram: lead.instagram || "",
    "Status do site": lead.website_status || "",
    "Diferenciais observados": lead.differentiators || "",
    "Oportunidade da landing page": lead.landing_page_opportunity || "",
    "Mensagem personalizada": lead.message || "",
    "Link para contato": lead.contact_link || "",
    "Melhor dia": lead.best_contact_day || "",
    "Melhor horário": lead.best_contact_time || "",
    "Motivo do horário": lead.contact_time_reason || "",
    "Fonte pública": lead.public_source || "",
    "Fonte de imagens": lead.image_source || "",
    "Prompt para gerar site": lead.prompt || "",
    "Status prospecção": lead.prospecting_status || "Não contatado",
    "Data do contato": "",
    Resposta: "",
    "Valor oferecido": "",
    Observações: lead.observations || "",
  }));
}

export function ProspectingPage() {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const queryClient = useQueryClient();
  const { organizationId } = useOrganization();
  const subscription = useSubscription();
  const [region, setRegion] = useState("Curitiba, PR");
  const [niche, setNiche] = useState("");
  const [quantity, setQuantity] = useState(20);
  const [websiteFilter, setWebsiteFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<Lead[]>([]);

  const usage = useQuery({
    queryKey: ["prospecting-usage", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("prospecting_usage", { target_organization_id: organizationId! });
      if (error) throw error;
      return (data?.[0] || { used: 0, monthly_limit: 0, remaining: 0 }) as { used: number; monthly_limit: number; remaining: number };
    },
  });

  const jobs = useQuery({
    queryKey: ["prospecting-jobs", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("prospecting_jobs").select("*").eq("organization_id", organizationId!).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data as ProspectingJob[];
    },
  });

  const planCode = subscription.data?.plan?.code || "free";
  const canGenerate = planCode !== "free";

  async function generate() {
    if (!niche.trim()) return toast.error("Informe o nicho que deseja pesquisar");
    setLoading(true);
    try {
      const response = await fetch("/api/prospecting/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ region, niche, quantity, websiteFilter }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível gerar a prospecção");
      setGenerated(data.leads || []);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["prospecting-usage", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["prospecting-jobs", organizationId] }),
        queryClient.invalidateQueries({ queryKey: ["leads", organizationId] }),
      ]);
      toast.success("Pesquisa concluída", { description: `${data.imported} novos leads foram adicionados ao CRM.` });
    } catch (error) {
      toast.error("Geração não concluída", { description: error instanceof Error ? error.message : "Tente novamente" });
    } finally {
      setLoading(false);
    }
  }

  function exportGenerated() {
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sheetRows(generated));
    XLSX.utils.book_append_sheet(workbook, worksheet, "100 Leads");
    XLSX.writeFile(workbook, `prospeccao_${niche.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Aquisição"
        title="Gerar prospecção"
        description="Pesquise negócios por nicho e região, revise as informações públicas e envie os novos leads diretamente ao CRM."
        actions={generated.length ? <Button variant="secondary" onClick={exportGenerated}><Download className="h-4 w-4" /> Exportar planilha</Button> : undefined}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><div><CardTitle>Nova pesquisa</CardTitle><CardDescription>Os resultados dependem da disponibilidade das fontes públicas. Revise antes de entrar em contato.</CardDescription></div><SearchCheck className="h-5 w-5 text-primary" /></CardHeader>
          <CardContent className="space-y-5">
            {!canGenerate ? (
              <div className="flex flex-col gap-4 rounded-lg border border-primary/25 bg-primary/[.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div><p className="text-sm font-medium">Recurso disponível nos planos pagos</p><p className="mt-1 text-xs text-zinc-500">Escolha um plano para liberar créditos mensais de pesquisa.</p></div>
                <Link href="/planos"><Button size="sm">Ver planos</Button></Link>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label htmlFor="region">Região</Label><Input id="region" value={region} onChange={(event) => setRegion(event.target.value)} placeholder="Curitiba, PR" /></div>
              <div><Label htmlFor="niche">Nicho</Label><Input id="niche" value={niche} onChange={(event) => setNiche(event.target.value)} placeholder="Restaurantes, clínicas, academias..." /></div>
              <div><Label htmlFor="quantity">Quantidade</Label><Input id="quantity" type="number" min={1} max={100} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} /></div>
              <div><Label htmlFor="website">Presença digital</Label><Select id="website" value={websiteFilter} onChange={(event) => setWebsiteFilter(event.target.value)}><option value="all">Todas as empresas</option><option value="without">Sem site localizado</option><option value="with">Com site localizado</option></Select></div>
            </div>
            <Button onClick={generate} disabled={!canGenerate || loading || !region.trim() || !niche.trim()}>
              <Sparkles className="h-4 w-4" />{loading ? "Pesquisando fontes públicas..." : `Gerar até ${quantity} leads`}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><div><CardTitle>Uso mensal</CardTitle><CardDescription>Créditos renovados a cada ciclo.</CardDescription></div><Badge tone="gray">{subscription.data?.plan?.name || "Gratuito"}</Badge></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between"><p className="text-3xl font-semibold">{usage.data?.remaining || 0}</p><p className="pb-1 text-xs text-zinc-500">restantes</p></div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[.06]"><div className="h-full bg-primary" style={{ width: `${usage.data?.monthly_limit ? Math.min(100, ((usage.data.used || 0) / usage.data.monthly_limit) * 100) : 0}%` }} /></div>
            <p className="mt-3 text-[11px] text-zinc-600">{usage.data?.used || 0} de {usage.data?.monthly_limit || 0} créditos utilizados</p>
            <div className="mt-6 flex gap-2 border-t border-line pt-5 text-[11px] leading-relaxed text-zinc-500"><ShieldCheck className="h-4 w-4 shrink-0 text-primary" /><p>Cada pesquisa registra usuário, quantidade, fonte e data para auditoria.</p></div>
          </CardContent>
        </Card>
      </div>

      {generated.length ? (
        <Card className="mt-5"><CardHeader><div><CardTitle>Resultado mais recente</CardTitle><CardDescription>{generated.length} leads novos adicionados ao CRM.</CardDescription></div><Badge tone="green">Concluído</Badge></CardHeader><CardContent className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-xs"><thead className="text-zinc-500"><tr className="border-b border-line"><th className="pb-3 font-medium">Empresa</th><th className="pb-3 font-medium">Segmento</th><th className="pb-3 font-medium">Localização</th><th className="pb-3 font-medium">Contato</th><th className="pb-3 font-medium">Site</th></tr></thead><tbody>{generated.slice(0, 20).map((lead) => <tr key={lead.id} className="border-b border-line/70"><td className="py-3 font-medium text-zinc-200">{lead.company_name}</td><td className="py-3 text-zinc-500">{lead.segment}</td><td className="py-3 text-zinc-500">{[lead.neighborhood, lead.city].filter(Boolean).join(", ")}</td><td className="py-3">{lead.contact_link ? <a className="inline-flex items-center gap-1 text-primary-light hover:underline" href={lead.contact_link} target="_blank" rel="noreferrer">Abrir <ExternalLink className="h-3 w-3" /></a> : <span className="text-zinc-600">Não localizado</span>}</td><td className="py-3 text-zinc-500">{lead.has_website ? "Localizado" : "Não localizado"}</td></tr>)}</tbody></table></CardContent></Card>
      ) : null}

      <Card className="mt-5"><CardHeader><div><CardTitle>Histórico de pesquisas</CardTitle><CardDescription>Últimas solicitações da organização.</CardDescription></div></CardHeader><CardContent className="space-y-2">{jobs.data?.length ? jobs.data.map((job) => <div key={job.id} className="grid gap-2 rounded-lg border border-line bg-[#0D0E0C] p-3 text-xs sm:grid-cols-[1fr_1fr_auto_auto] sm:items-center"><p className="font-medium text-zinc-200">{job.niche}</p><p className="text-zinc-500">{job.region}</p><p className="text-zinc-500">{job.generated_quantity}/{job.requested_quantity} leads</p><Badge tone={job.status === "completed" ? "green" : job.status === "failed" ? "red" : "amber"}>{job.status}</Badge></div>) : <p className="py-8 text-center text-sm text-zinc-600">Nenhuma pesquisa realizada.</p>}</CardContent></Card>
    </>
  );
}
