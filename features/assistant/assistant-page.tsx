"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Check, CircleAlert, Loader2, Send, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/ui/page-header";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AssistantDecision } from "./decision";

type Settings = { enabled: boolean; business_description: string; offer: string; pricing: string; tone: string; handoff_rules: string; signature: string };
const EMPTY: Settings = { enabled: false, business_description: "", offer: "", pricing: "", tone: "", handoff_rules: "", signature: "" };
type Status = { ai: boolean; aiProvider: string; whatsapp: boolean; webhook: boolean; admin: boolean; organizationMatches: boolean; organizationId: string };

const ACTION_LABEL: Record<string, string> = { none: "Só responder", move_stage: "Mudar etapa", schedule_follow_up: "Agendar retorno", handoff: "Chamar você", mark_lost: "Marcar como perdido" };

function useAssistantSettings() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  return useQuery({
    queryKey: ["assistant-settings", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase.from("assistant_settings").select("*").eq("organization_id", organizationId!).maybeSingle();
      if (error) throw error;
      return { ...EMPTY, ...Object.fromEntries(Object.entries(data || {}).map(([key, value]) => [key, value ?? (key === "enabled" ? false : "")])) } as Settings;
    },
  });
}

function StatusItem({ ok, label, hint }: { ok: boolean; label: string; hint: string }) {
  return (
    <li className="flex items-start gap-2.5 py-2">
      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />}
      <div><p className="text-sm text-zinc-200">{label}</p>{!ok ? <p className="text-xs text-zinc-500">{hint}</p> : null}</div>
    </li>
  );
}

export function AssistantPage() {
  const { organizationId, role, userId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const queryClient = useQueryClient();
  const settingsQuery = useAssistantSettings();
  const statusQuery = useQuery({ queryKey: ["assistant-status"], queryFn: async () => (await fetch("/api/assistant/status")).json() as Promise<Status> });
  const [form, setForm] = useState<Settings>(EMPTY);
  const [saving, setSaving] = useState(false);
  const canEdit = role === "admin" || role === "manager";

  useEffect(() => { if (settingsQuery.data) setForm(settingsQuery.data); }, [settingsQuery.data]);
  const set = (key: keyof Settings) => (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save(next = form) {
    if (!organizationId) return;
    setSaving(true);
    const { error } = await supabase.from("assistant_settings").upsert({ ...next, organization_id: organizationId, updated_at: new Date().toISOString(), updated_by: userId });
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar", { description: error.message });
    queryClient.invalidateQueries({ queryKey: ["assistant-settings", organizationId] });
    toast.success(next.enabled ? "Configuração salva · respondendo automaticamente" : "Configuração salva");
  }

  async function toggle() {
    const next = { ...form, enabled: !form.enabled };
    if (next.enabled && !form.offer.trim()) return toast.error("Preencha pelo menos “O que você oferece” antes de ligar.");
    setForm(next);
    await save(next);
  }

  // Simulador
  const [conversation, setConversation] = useState<Array<{ direction: "in" | "out"; message: string; decision?: AssistantDecision }>>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  async function simulate(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const next = [...conversation, { direction: "in" as const, message: text }];
    setConversation(next);
    setDraft("");
    setThinking(true);
    try {
      const response = await fetch("/api/assistant/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ settings: form, conversation: next.map(({ direction, message }) => ({ direction, message })) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha na simulação");
      const decision = data.decision as AssistantDecision;
      setConversation([...next, { direction: "out", message: decision.reply || "(a IA não enviaria mensagem)", decision }]);
    } catch (error) {
      toast.error("Simulação não concluída", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setThinking(false); }
  }

  const status = statusQuery.data;

  return (
    <>
      <PageHeader eyebrow="Atendimento" title="Assistente de IA" description="Responde no WhatsApp os leads que responderem à sua prospecção, atualiza o Pipeline e chama você quando precisar." actions={
        <Button onClick={toggle} disabled={!canEdit || saving || settingsQuery.isPending} variant={form.enabled ? "secondary" : "default"}>
          <Bot className="h-4 w-4" /> {form.enabled ? "Desligar respostas automáticas" : "Ligar respostas automáticas"}
        </Button>
      } />

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <div className="space-y-6">
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <h2 className="text-sm font-semibold text-white">Como o assistente deve falar</h2>
              <Badge tone={form.enabled ? "green" : "gray"} className="ml-auto">{form.enabled ? "Respondendo" : "Desligado"}</Badge>
            </div>
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
              <div><Label htmlFor="signature">Nome da empresa / quem assina</Label><Input id="signature" value={form.signature} onChange={set("signature")} placeholder="Ex.: Lynk Soluções Digitais" disabled={!canEdit} /></div>
              <div><Label htmlFor="business">Quem você é</Label><Textarea id="business" className="min-h-20" value={form.business_description} onChange={set("business_description")} placeholder="Ex.: Agência de Curitiba que cria sites e assistentes de IA para pequenas empresas." disabled={!canEdit} /></div>
              <div><Label htmlFor="offer">O que você oferece *</Label><Textarea id="offer" className="min-h-24" value={form.offer} onChange={set("offer")} placeholder="Ex.: Sites rápidos com WhatsApp e Google; assistente de IA no WhatsApp; sistemas de estoque. Entrega em 7 a 15 dias." disabled={!canEdit} /></div>
              <div><Label htmlFor="pricing">Preços</Label><Textarea id="pricing" className="min-h-20" value={form.pricing} onChange={set("pricing")} placeholder="Ex.: Site a partir de R$ 900. Ou: não falar preço, oferecer conversa." disabled={!canEdit} /></div>
              <div><Label htmlFor="tone">Tom de voz</Label><Input id="tone" value={form.tone} onChange={set("tone")} placeholder="Ex.: próximo, direto, sem formalidade" disabled={!canEdit} /></div>
              <div><Label htmlFor="handoff">Quando chamar você (além do padrão)</Label><Textarea id="handoff" className="min-h-20" value={form.handoff_rules} onChange={set("handoff_rules")} placeholder="Ex.: sempre que pedirem desconto ou falarem de prazo menor que 7 dias." disabled={!canEdit} /></div>
              <p className="text-xs leading-relaxed text-zinc-500">Por padrão a IA chama você quando pedem proposta, preço fechado, reunião, negociação, reclamação, quando mandam áudio/imagem ou quando ela não tem segurança. Ela nunca inventa preço, prazo ou garantia que não esteja aqui.</p>
              {canEdit ? <div className="flex justify-end"><Button type="submit" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button></div> : <p className="text-xs text-amber-300">Só administradores e gestores alteram o assistente.</p>}
            </form>
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="mb-2 text-sm font-semibold text-white">O que falta configurar</h2>
            {status ? (
              <ul className="divide-y divide-line">
                <StatusItem ok={status.ai} label={`IA (${status.aiProvider === "gemini" ? "Gemini gratuito" : status.aiProvider})`} hint="Cadastre GEMINI_API_KEY na Vercel (aistudio.google.com → Get API key)." />
                <StatusItem ok={status.whatsapp} label="API oficial do WhatsApp" hint="Cadastre WHATSAPP_API_TOKEN e WHATSAPP_PHONE_NUMBER_ID (Etapa 2 do passo a passo)." />
                <StatusItem ok={status.webhook} label="Webhook do WhatsApp" hint="Cadastre WHATSAPP_APP_SECRET e WHATSAPP_VERIFY_TOKEN e ligue o webhook (Etapa 6)." />
                <StatusItem ok={status.admin} label="Chave administrativa do Supabase" hint="Cadastre SUPABASE_SERVICE_ROLE_KEY (Etapa 4)." />
                <StatusItem ok={status.organizationMatches} label="Empresa ligada ao número" hint={`Cadastre WHATSAPP_ORGANIZATION_ID = ${status.organizationId}`} />
              </ul>
            ) : <p className="text-sm text-muted">Verificando...</p>}
          </Card>
        </div>

        <Card className="flex flex-col p-4 sm:p-5 lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)]">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">Simulador</h2>
            <span className="text-xs text-zinc-500">Escreva como se fosse um lead. Nada é enviado.</span>
            {conversation.length ? <Button variant="ghost" size="icon" className="ml-auto h-8 w-8" onClick={() => setConversation([])} aria-label="Limpar simulação"><Trash2 className="h-4 w-4" /></Button> : null}
          </div>
          <div className="min-h-64 flex-1 space-y-3 overflow-y-auto rounded-xl border border-line bg-[#090909] p-3" aria-live="polite">
            {!conversation.length ? <p className="py-10 text-center text-xs text-zinc-600">Ex.: “Oi, vi sua mensagem. Quanto custa um site?”</p> : null}
            {conversation.map((item, index) => (
              <div key={index} className={cn("flex", item.direction === "in" ? "justify-start" : "justify-end")}>
                <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", item.direction === "in" ? "bg-white/[.06] text-zinc-200" : "bg-primary/20 text-white")}>
                  <p className="whitespace-pre-line">{item.message}</p>
                  {item.decision && item.decision.action !== "none" ? (
                    <p className="mt-1.5 text-[11px] text-primary-light">
                      Ação: {ACTION_LABEL[item.decision.action]}{item.decision.stage ? ` → ${item.decision.stage}` : ""}{item.decision.follow_up_at ? ` · ${new Date(item.decision.follow_up_at).toLocaleString("pt-BR")}` : ""}{item.decision.handoff_reason ? ` · ${item.decision.handoff_reason}` : ""}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
            {thinking ? <div className="flex justify-end"><span className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 px-3 py-2 text-xs text-zinc-400"><Loader2 className="h-3.5 w-3.5 animate-spin" />pensando...</span></div> : null}
          </div>
          <form onSubmit={simulate} className="mt-3 flex gap-2">
            <Input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Mensagem do lead" aria-label="Mensagem do lead (simulação)" disabled={thinking} />
            <Button type="submit" disabled={thinking || !draft.trim()} aria-label="Enviar simulação"><Send className="h-4 w-4" /></Button>
          </form>
          <p className="mt-2 text-[11px] text-zinc-600">A simulação usa o texto da configuração ao lado, mesmo antes de salvar.{!status?.ai ? <span className="text-amber-300"> <X className="inline h-3 w-3" /> IA ainda não configurada no servidor.</span> : null}</p>
        </Card>
      </div>
    </>
  );
}
