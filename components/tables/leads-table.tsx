"use client";

import { ContactRound, ExternalLink, Eye, Mail, MessageCircle, MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, initials } from "@/lib/utils";
import type { Lead } from "@/types";

const statusTone: Record<string, "blue" | "green" | "amber" | "red" | "gray" | "purple"> = {
  Novo: "blue",
  "Contato enviado": "purple",
  Respondeu: "amber",
  "Reunião marcada": "purple",
  "Proposta enviada": "blue",
  Negociação: "amber",
  Fechado: "green",
  Perdido: "red",
};

const priorityDot: Record<string, string> = {
  Alta: "bg-red-400",
  Média: "bg-amber-400",
  Baixa: "bg-emerald-400",
};

export function LeadsTable({ leads, onView, onContact, onEdit, onDelete, onCreate, onWhatsAppApi, onEmail }: {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onContact: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onCreate: () => void;
  onWhatsAppApi?: (lead: Lead) => void;
  onEmail?: (lead: Lead) => void;
}) {
  const [menu, setMenu] = useState<string | null>(null);

  if (!leads.length) {
    return <EmptyState icon={ContactRound} title="Nenhum lead encontrado" description="Crie um lead ou ajuste os filtros para voltar a visualizar oportunidades." action={<Button onClick={onCreate}>Criar primeiro lead</Button>} />;
  }

  function Actions({ lead, mobile = false }: { lead: Lead; mobile?: boolean }) {
    const open = menu === lead.id;
    return (
      <div className="relative">
        <Button variant="ghost" size="icon" onClick={() => setMenu(open ? null : lead.id)} aria-label="Abrir ações" className={mobile ? "h-8 w-8" : undefined}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
        {open ? (
          <div className={`absolute z-30 w-48 rounded-xl border border-line bg-[#0D0F10] p-1.5 text-left shadow-2xl ${mobile ? "right-0 top-9" : "right-0 top-10"}`}>
            <button onClick={() => { onView(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Eye className="h-3.5 w-3.5" /> Ver detalhes</button>
            {(lead.contact_link || lead.whatsapp || lead.instagram) ? <button onClick={() => { onContact(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-primary hover:bg-primary/10"><MessageCircle className="h-3.5 w-3.5" /> Abrir contato</button> : null}
            {lead.whatsapp && onWhatsAppApi ? <button onClick={() => { onWhatsAppApi(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-primary hover:bg-primary/10"><Send className="h-3.5 w-3.5" /> Enviar via API</button> : null}
            {lead.email && onEmail ? <button onClick={() => { onEmail(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Mail className="h-3.5 w-3.5" /> Enviar e-mail</button> : null}
            <button onClick={() => { onEdit(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Pencil className="h-3.5 w-3.5" /> Editar lead</button>
            {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><ExternalLink className="h-3.5 w-3.5" /> Abrir site</a> : null}
            <button onClick={() => { onDelete(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3 p-3 md:hidden">
        {leads.map((lead) => (
          <article key={lead.id} className="rounded-xl border border-line/80 bg-background/35 p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/[.055] text-xs font-semibold text-primary">{initials(lead.company_name)}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-zinc-100">{lead.company_name}</h3>
                    <p className="mt-1 truncate text-[11px] text-muted">{[lead.city, lead.state].filter(Boolean).join(" · ") || lead.segment || "Localização não informada"}</p>
                  </div>
                  <Actions lead={lead} mobile />
                </div>
                <p className="mt-3 truncate text-xs text-zinc-400">{lead.contact_name || "Contato não informado"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Badge tone={statusTone[lead.status]}>{lead.status}</Badge>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface/70 px-2.5 py-1 text-[10px] text-zinc-400">
                <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[lead.priority] || "bg-zinc-500"}`} />
                {lead.priority}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[.05] text-[9px] text-zinc-400">{initials(lead.responsible?.name)}</span>
                <span className="truncate text-[10px] text-zinc-500">{lead.responsible?.name || "Sem responsável"}</span>
              </div>
              <span className="shrink-0 text-[10px] text-zinc-600">{formatDate(lead.created_at)}</span>
            </div>
          </article>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[1040px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-white/[.012] text-[10px] uppercase tracking-[.12em] text-zinc-600">
              <th className="px-5 py-3.5 font-medium">Empresa</th>
              <th className="px-4 py-3.5 font-medium">Contato</th>
              <th className="px-4 py-3.5 font-medium">Status</th>
              <th className="px-4 py-3.5 font-medium">Prioridade</th>
              <th className="px-4 py-3.5 font-medium">Responsável</th>
              <th className="px-4 py-3.5 font-medium">Criado em</th>
              <th className="px-5 py-3.5 text-right font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b border-line/60 text-sm transition last:border-0 hover:bg-white/[.025]">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-zinc-100">{lead.company_name}</div>
                  <div className="mt-1 text-[11px] text-zinc-600">{[lead.segment, lead.city, lead.state].filter(Boolean).join(" · ") || "Sem segmento"}</div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="text-xs text-zinc-300">{lead.contact_name || "—"}</div>
                  <div className="mt-1 text-[11px] text-zinc-600">{lead.whatsapp || lead.email || "Sem contato"}</div>
                </td>
                <td className="px-4 py-3.5"><Badge tone={statusTone[lead.status]}>{lead.status}</Badge></td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex items-center gap-2 text-xs text-zinc-400"><span className={`h-1.5 w-1.5 rounded-full ${priorityDot[lead.priority] || "bg-zinc-500"}`} />{lead.priority}</span>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.05] text-[9px] text-zinc-400">{initials(lead.responsible?.name)}</span>
                    <span className="max-w-32 truncate text-[11px] text-zinc-400">{lead.responsible?.name || "Não definido"}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-[11px] text-zinc-500">{formatDate(lead.created_at)}</td>
                <td className="px-5 py-3.5 text-right"><Actions lead={lead} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
