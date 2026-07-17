"use client";

import { Eye, ExternalLink, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, initials } from "@/lib/utils";
import type { Lead } from "@/types";
import { ContactRound } from "lucide-react";

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

export function LeadsTable({ leads, onView, onContact, onEdit, onDelete, onCreate }: {
  leads: Lead[];
  onView: (lead: Lead) => void;
  onContact: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onCreate: () => void;
}) {
  const [menu, setMenu] = useState<string | null>(null);

  if (!leads.length) {
    return <EmptyState icon={ContactRound} title="Nenhum lead encontrado" description="Crie um lead ou ajuste os filtros para voltar a visualizar oportunidades." action={<Button onClick={onCreate}>Criar primeiro lead</Button>} />;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left">
        <thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-4 font-medium">Empresa</th><th className="px-4 py-4 font-medium">Contato</th><th className="px-4 py-4 font-medium">Status</th><th className="px-4 py-4 font-medium">Prioridade</th><th className="px-4 py-4 font-medium">Responsável</th><th className="px-4 py-4 font-medium">Criado em</th><th className="px-5 py-4 text-right font-medium">Ações</th></tr></thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-b border-line/70 text-sm transition last:border-0 hover:bg-white/[.018]">
              <td className="px-5 py-4"><div className="font-medium text-zinc-100">{lead.company_name}</div><div className="mt-1 text-xs text-zinc-600">{[lead.segment, lead.city, lead.state].filter(Boolean).join(" · ") || "Sem segmento"}</div></td>
              <td className="px-4 py-4"><div className="text-zinc-300">{lead.contact_name || "—"}</div><div className="mt-1 text-xs text-zinc-600">{lead.whatsapp || lead.email || "Sem contato"}</div></td>
              <td className="px-4 py-4"><Badge tone={statusTone[lead.status]}>{lead.status}</Badge></td>
              <td className="px-4 py-4"><span className={lead.priority === "Alta" ? "text-red-300" : lead.priority === "Média" ? "text-amber-300" : "text-zinc-500"}>{lead.priority}</span></td>
              <td className="px-4 py-4"><div className="flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[.05] text-[10px] text-zinc-400">{initials(lead.responsible?.name)}</span><span className="text-xs text-zinc-400">{lead.responsible?.name || "Não definido"}</span></div></td>
              <td className="px-4 py-4 text-xs text-zinc-500">{formatDate(lead.created_at)}</td>
              <td className="relative px-5 py-4 text-right">
                <Button variant="ghost" size="icon" onClick={() => setMenu(menu === lead.id ? null : lead.id)} aria-label="Abrir ações"><MoreHorizontal className="h-4 w-4" /></Button>
                {menu === lead.id ? (
                  <div className="absolute right-5 top-12 z-20 w-44 rounded-xl border border-line bg-[#111] p-1.5 text-left shadow-2xl">
                    <button onClick={() => { onView(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Eye className="h-3.5 w-3.5" /> Ver abordagem</button>
                    {(lead.contact_link || lead.whatsapp || lead.instagram) ? <button onClick={() => { onContact(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-primary-light hover:bg-primary/10"><MessageCircle className="h-3.5 w-3.5" /> Abrir e marcar envio</button> : null}
                    <button onClick={() => { onEdit(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Pencil className="h-3.5 w-3.5" /> Editar lead</button>
                    {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><ExternalLink className="h-3.5 w-3.5" /> Abrir site</a> : null}
                    <button onClick={() => { onDelete(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
                  </div>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
