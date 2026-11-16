"use client";

import { CalendarClock, ContactRound, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { followUpBucket } from "@/features/leads/follow-ups";
import { stageInfo, stageLabel } from "@/features/leads/stages";
import { hasWhatsApp } from "@/features/leads/whatsapp-link";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, Task } from "@/types";

function FollowUp({ task }: { task?: Task }) {
  if (!task) return <span className="text-xs text-zinc-700">—</span>;
  const bucket = followUpBucket(task.scheduled_at);
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs", bucket === "overdue" ? "text-red-300" : bucket === "today" ? "text-amber-300" : "text-zinc-400")}>
      <CalendarClock className="h-3.5 w-3.5" />
      {bucket === "today" ? `Hoje, ${new Date(task.scheduled_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : formatDate(task.scheduled_at)}
      {bucket === "overdue" ? " · atrasado" : ""}
    </span>
  );
}

function location(lead: Lead) {
  return [lead.city, lead.state].filter(Boolean).join("/") || "—";
}

export function LeadsTable({ leads, followUps, onOpen, onWhatsApp, onEdit, onDelete, onCreate }: {
  leads: Lead[];
  followUps: Map<string, Task>;
  onOpen: (lead: Lead) => void;
  onWhatsApp: (lead: Lead) => void;
  onEdit: (lead: Lead) => void;
  onDelete: (lead: Lead) => void;
  onCreate: () => void;
}) {
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  if (!leads.length) {
    return <EmptyState icon={ContactRound} title="Nenhum lead encontrado" description="Cadastre ou importe leads, ou ajuste a busca e os filtros." action={<Button onClick={onCreate}>Cadastrar lead</Button>} />;
  }

  const actions = (lead: Lead) => (
    <div className="relative flex items-center justify-end gap-1" onClick={(event) => event.stopPropagation()}>
      {hasWhatsApp(lead) ? <Button variant="ghost" size="icon" className="h-9 w-9 text-primary-light" onClick={() => onWhatsApp(lead)} aria-label={`Abrir WhatsApp de ${lead.company_name}`} title="Abrir WhatsApp"><MessageCircle className="h-4 w-4" /></Button> : null}
      <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMenu(menu === lead.id ? null : lead.id)} aria-label="Mais ações"><MoreHorizontal className="h-4 w-4" /></Button>
      {menu === lead.id ? (
        <div className="absolute right-0 top-10 z-20 w-40 rounded-xl border border-line bg-[#111] p-1.5 text-left shadow-2xl">
          <button onClick={() => { onEdit(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-zinc-300 hover:bg-white/[.06]"><Pencil className="h-3.5 w-3.5" /> Editar dados</button>
          <button onClick={() => { onDelete(lead); setMenu(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-red-300 hover:bg-red-400/10"><Trash2 className="h-3.5 w-3.5" /> Excluir</button>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Celular: cartões */}
      <ul className="divide-y divide-line md:hidden">
        {leads.map((lead) => (
          <li key={lead.id} className="flex items-start gap-3 px-4 py-3.5" onClick={() => onOpen(lead)}>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-zinc-100">{lead.company_name}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-600">{location(lead)}{lead.suggested_service ? ` · ${lead.suggested_service}` : ""}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2"><Badge tone={stageInfo(lead.status).tone}>{stageLabel(lead.status)}</Badge><FollowUp task={followUps.get(lead.id)} /></div>
            </div>
            {actions(lead)}
          </li>
        ))}
      </ul>

      {/* Computador: tabela */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-left">
          <thead><tr className="border-b border-line text-[11px] uppercase tracking-wider text-zinc-600"><th className="px-5 py-4 font-medium">Empresa</th><th className="px-4 py-4 font-medium">Cidade/UF</th><th className="px-4 py-4 font-medium">Serviço sugerido</th><th className="px-4 py-4 font-medium">Etapa</th><th className="px-4 py-4 font-medium">Próximo retorno</th><th className="px-5 py-4 text-right font-medium"><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} onClick={() => onOpen(lead)} className="cursor-pointer border-b border-line/70 text-sm transition last:border-0 hover:bg-white/[.018]">
                <td className="px-5 py-3.5"><div className="font-medium text-zinc-100">{lead.company_name}</div><div className="mt-0.5 text-xs text-zinc-600">{lead.segment || lead.contact_name || "—"}</div></td>
                <td className="px-4 py-3.5 text-zinc-400">{location(lead)}</td>
                <td className="px-4 py-3.5 text-zinc-300">{lead.suggested_service || <span className="text-zinc-700">—</span>}</td>
                <td className="px-4 py-3.5"><Badge tone={stageInfo(lead.status).tone} className="whitespace-nowrap">{stageLabel(lead.status)}</Badge></td>
                <td className="px-4 py-3.5"><FollowUp task={followUps.get(lead.id)} /></td>
                <td className="px-5 py-3.5">{actions(lead)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
