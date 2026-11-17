"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Hand, Pause, Play, Send, User } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@/features/auth/organization-provider";
import { createBrowserSupabase } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";
import type { Lead } from "@/types";
import { insideWhatsAppWindow } from "./decision";

type Message = { id: string; direction: "in" | "out"; author: "lead" | "ai" | "human" | null; message: string; created_at: string; status: string };

const AUTHOR = { lead: "Lead", ai: "Assistente", human: "Você" } as const;

/** Conversa do WhatsApp (API) na ficha do lead + controle do assistente de IA. */
export function ConversationPanel({ lead }: { lead: Lead }) {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const messagesQuery = useQuery({
    queryKey: ["whatsapp-messages", lead.id],
    refetchInterval: 15_000, // atualiza sozinho enquanto a ficha estiver aberta
    queryFn: async () => {
      const { data, error } = await supabase.from("whatsapp_messages").select("id,direction,author,message,created_at,status").eq("lead_id", lead.id).order("created_at", { ascending: true }).limit(200);
      if (error) throw error;
      return (data || []) as Message[];
    },
  });

  async function updateAi(values: Partial<Pick<Lead, "ai_paused" | "ai_handoff_at" | "ai_handoff_reason">>, message: string) {
    const { error } = await supabase.from("leads").update(values).eq("id", lead.id);
    if (error) return toast.error("Não foi possível atualizar", { description: error.message });
    queryClient.invalidateQueries({ queryKey: ["leads", organizationId] });
    toast.success(message);
  }

  async function reply(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/reply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ leadId: lead.id, text: draft }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha no envio");
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", lead.id] });
      queryClient.invalidateQueries({ queryKey: ["leads", organizationId] });
      toast.success("Mensagem enviada");
    } catch (error) {
      toast.error("Mensagem não enviada", { description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setSending(false); }
  }

  const messages = messagesQuery.data || [];
  const windowOpen = insideWhatsAppWindow(lead.last_inbound_at);
  const aiState = lead.ai_paused ? "paused" : lead.ai_handoff_at ? "handoff" : "active";

  return (
    <div className="rounded-xl border border-line bg-[#090909] p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <p className="text-xs font-medium text-zinc-300">Conversa no WhatsApp</p>
        {aiState === "active" ? <Badge tone="green" className="px-2 py-0.5 text-[10px]"><Bot className="mr-1 h-3 w-3" />IA ativa</Badge>
          : aiState === "handoff" ? <Badge tone="amber" className="px-2 py-0.5 text-[10px]"><Hand className="mr-1 h-3 w-3" />Precisa de você</Badge>
          : <Badge tone="gray" className="px-2 py-0.5 text-[10px]"><Pause className="mr-1 h-3 w-3" />IA pausada</Badge>}
        <div className="ml-auto flex gap-1">
          {aiState === "active"
            ? <Button variant="ghost" size="sm" onClick={() => updateAi({ ai_paused: true }, "IA pausada neste lead")}><Pause className="h-3.5 w-3.5" /> Pausar IA</Button>
            : <Button variant="ghost" size="sm" onClick={() => updateAi({ ai_paused: false, ai_handoff_at: null, ai_handoff_reason: null }, "A IA volta a responder este lead")}><Play className="h-3.5 w-3.5" /> Devolver para a IA</Button>}
        </div>
      </div>
      {aiState === "handoff" && lead.ai_handoff_reason ? <p className="mb-3 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">{lead.ai_handoff_reason}</p> : null}

      <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
        {messagesQuery.isPending ? <p className="py-4 text-center text-xs text-zinc-600">Carregando...</p> : null}
        {!messagesQuery.isPending && !messages.length ? <p className="py-4 text-center text-xs text-zinc-600">Nenhuma mensagem registrada ainda. As mensagens aparecem aqui quando o número estiver conectado à API do WhatsApp.</p> : null}
        {messages.map((message) => (
          <div key={message.id} className={cn("flex", message.direction === "in" ? "justify-start" : "justify-end")}>
            <div className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-sm", message.direction === "in" ? "bg-white/[.06] text-zinc-200" : message.author === "ai" ? "bg-primary/20 text-white" : "bg-emerald-400/10 text-zinc-100")}>
              <p className="whitespace-pre-line">{message.message}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-zinc-500">
                {message.author === "ai" ? <Bot className="h-3 w-3" /> : <User className="h-3 w-3" />}
                {AUTHOR[message.author || (message.direction === "in" ? "lead" : "human")]} · {formatDate(message.created_at, true)}{message.status === "failed" ? " · falhou" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={reply} className="mt-3 flex items-end gap-2">
        <Textarea value={draft} onChange={(event) => setDraft(event.target.value)} className="min-h-11" rows={2} placeholder={windowOpen ? "Responder pelo Lynk (a IA para de responder este lead)" : "Fora da janela de 24 h: responda pelo celular"} disabled={!windowOpen || sending} aria-label="Responder lead" />
        <Button type="submit" disabled={!windowOpen || sending || !draft.trim()} aria-label="Enviar resposta"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
