"use client";

import { addDays, format, setHours, setMinutes } from "date-fns";
import { CalendarClock, Check, CheckCheck, Copy, ExternalLink, Globe, Instagram, Link2, Mail, MessageCircle, Pencil, Phone, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatDate } from "@/lib/utils";
import type { Lead, LeadStatus, Task } from "@/types";
import { followUpBucket, useScheduleFollowUp } from "./follow-ups";
import { StageOptions } from "./stage-options";
import { stageInfo, stageLabel, stageOf } from "./stages";
import { useUpdateLead } from "./use-leads";
import { ConversationPanel } from "@/features/assistant/conversation-panel";
import { useContactLead, type ContactChannel } from "./use-contact-lead";
import { getInstagramTarget, getOtherContactLink, getProbableWhatsApp, getWhatsAppTarget } from "./whatsapp-link";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Tente novamente.";
}

function toInputValue(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function defaultFollowUp() {
  return toInputValue(setMinutes(setHours(addDays(new Date(), 1), 9), 0));
}

function withProtocol(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function Info({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border border-line bg-[#090909] p-2.5 sm:p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</p>
      <div className="mt-1 break-words text-[13px] text-zinc-200 [overflow-wrap:anywhere] sm:mt-1.5 sm:text-sm">{children}</div>
    </div>
  );
}

function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-[#090909] p-4">
      <p className="text-xs font-medium text-zinc-300">{label}</p>
      <div className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-500">{children}</div>
    </div>
  );
}

export function LeadDetail({ lead, followUp, onEdit }: { lead: Lead; followUp?: Task; onEdit: () => void }) {
  const updateLead = useUpdateLead();
  const followUps = useScheduleFollowUp();
  const [message, setMessage] = useState(lead.message || "");
  const [notes, setNotes] = useState(lead.observations || "");
  const [followUpAt, setFollowUpAt] = useState(followUp ? toInputValue(new Date(followUp.scheduled_at)) : defaultFollowUp());

  useEffect(() => { setMessage(lead.message || ""); }, [lead.id, lead.message]);
  useEffect(() => { setNotes(lead.observations || ""); }, [lead.id, lead.observations]);
  useEffect(() => { setFollowUpAt(followUp ? toInputValue(new Date(followUp.scheduled_at)) : defaultFollowUp()); }, [followUp]);

  // O link é gerado com o texto que está na tela agora, inclusive se acabou de ser editado.
  const whatsapp = getWhatsAppTarget(lead, message);
  const probable = getProbableWhatsApp(lead, message);
  const instagram = getInstagramTarget(lead);
  const contactLead = useContactLead();
  const otherLink = getOtherContactLink(lead);
  const messageDirty = message.trim() !== (lead.message || "").trim();
  const notesDirty = notes.trim() !== (lead.observations || "").trim();
  const stage = stageInfo(lead.status);

  async function saveMessage(silent = false) {
    try {
      await updateLead.mutateAsync({ id: lead.id, values: { message } });
      if (!silent) toast.success("Mensagem salva");
    } catch (error) { toast.error("Não foi possível salvar a mensagem", { description: errorMessage(error) }); }
  }

  async function saveNotes() {
    try {
      await updateLead.mutateAsync({ id: lead.id, values: { observations: notes } });
      toast.success("Notas salvas");
    } catch (error) { toast.error("Não foi possível salvar as notas", { description: errorMessage(error) }); }
  }

  async function confirmWhatsApp() {
    if (!probable) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, values: { whatsapp: lead.whatsapp || lead.phone || probable.number, whatsapp_confirmed: true } });
      toast.success("WhatsApp marcado como confirmado");
    } catch (error) { toast.error("Não foi possível confirmar", { description: errorMessage(error) }); }
  }

  // Abre a conversa com a mensagem que está na tela e já move o lead para "Contatado".
  function openChannel(channel: ContactChannel) {
    void contactLead.contact(lead, channel, message);
  }

  async function markContacted() {
    const moveStage = stageOf(lead.status) === "Novo";
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        values: {
          contacted_at: new Date().toISOString(),
          ...(moveStage ? { status: "Contato enviado" as LeadStatus } : {}),
          ...(messageDirty ? { message } : {}),
        },
        previousStatus: lead.status,
      });
      toast.success(moveStage ? "Lead marcado como Contatado" : "Contato registrado", { description: moveStage ? undefined : `Etapa mantida: ${stageLabel(lead.status)}` });
    } catch (error) { toast.error("Não foi possível registrar o contato", { description: errorMessage(error) }); }
  }

  async function changeStage(status: LeadStatus) {
    if (status === lead.status) return;
    try {
      await updateLead.mutateAsync({ id: lead.id, values: { status }, previousStatus: lead.status });
      toast.success(`Etapa alterada para ${stageLabel(status)}`);
    } catch (error) { toast.error("Não foi possível alterar a etapa", { description: errorMessage(error) }); }
  }

  async function saveFollowUp() {
    if (!followUpAt) return toast.error("Escolha a data do retorno");
    try {
      await followUps.schedule(lead, followUp, followUpAt);
      toast.success("Retorno agendado", { description: formatDate(new Date(followUpAt), true) });
    } catch (error) { toast.error("Não foi possível agendar o retorno", { description: errorMessage(error) }); }
  }

  async function finishFollowUp(kind: "complete" | "cancel") {
    if (!followUp) return;
    try {
      await (kind === "complete" ? followUps.complete(followUp) : followUps.cancel(followUp));
      toast.success(kind === "complete" ? "Retorno concluído" : "Retorno removido");
    } catch (error) { toast.error("Não foi possível atualizar o retorno", { description: errorMessage(error) }); }
  }

  const bucket = followUp ? followUpBucket(followUp.scheduled_at) : null;

  return (
    <div className="space-y-5">
      {/* Ações principais */}
      <div className="flex flex-col gap-3 rounded-xl border border-line bg-[#090909] p-3 sm:flex-row sm:items-center">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Badge tone={stage.tone}>{stageLabel(lead.status)}</Badge>
          {lead.suggested_service ? <Badge tone="gray">{lead.suggested_service}</Badge> : null}
          {lead.contacted_at ? <span className="text-xs text-zinc-500">Último contato: {formatDate(lead.contacted_at, true)}</span> : <span className="text-xs text-zinc-600">Sem contato registrado</span>}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2 sm:flex">
          {whatsapp ? <Button onClick={() => openChannel("whatsapp")} disabled={contactLead.isPending} className="col-span-2 whitespace-nowrap sm:col-auto"><MessageCircle className="h-4 w-4" /> Abrir WhatsApp</Button> : null}
          {probable ? <Button variant="outline" onClick={() => openChannel("whatsapp_probable")} disabled={contactLead.isPending} className="col-span-2 whitespace-nowrap sm:col-auto" title="Celular sem confirmação de WhatsApp"><MessageCircle className="h-4 w-4" /> Abrir WhatsApp (a confirmar)</Button> : null}
          {instagram ? <Button variant={whatsapp || probable ? "secondary" : "default"} onClick={() => openChannel("instagram")} disabled={contactLead.isPending} className="col-span-2 whitespace-nowrap sm:col-auto" title={`Direct do Instagram @${instagram.handle} (a mensagem é copiada)`}><Instagram className="h-4 w-4" /> Abrir Instagram</Button> : null}
          <Button variant="secondary" onClick={markContacted} disabled={updateLead.isPending} className="whitespace-nowrap px-3"><CheckCheck className="h-4 w-4" /> Marcar como contatado</Button>
          <Button variant="ghost" onClick={onEdit} aria-label="Editar dados"><Pencil className="h-4 w-4" /> <span className="hidden sm:inline">Editar</span></Button>
        </div>
      </div>
      {probable ? (
        <p className="-mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-300/90">
          WhatsApp a confirmar{lead.whatsapp_source ? ` · origem: ${lead.whatsapp_source.replace(/\s*\(.*\)\s*$/, "").toLowerCase()}` : ""}.
          <button type="button" onClick={confirmWhatsApp} disabled={updateLead.isPending} className="text-primary-light underline-offset-2 hover:underline">Marcar como WhatsApp confirmado</button>
        </p>
      ) : !whatsapp && !instagram ? <p className="-mt-2 text-xs text-zinc-600">Sem WhatsApp nem Instagram. {lead.phone ? "O telefone cadastrado é fixo ou não é celular." : ""}</p> : null}
      {whatsapp || probable || instagram ? <p className="-mt-2 text-xs text-zinc-600">Ao abrir a conversa, o lead vai para <strong className="font-medium text-zinc-400">Contatado</strong> automaticamente.{instagram ? " No Instagram, a mensagem é copiada para você colar." : ""}</p> : null}

      {/* Empresa e canais */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-3">
        <Info label="Segmento">{lead.segment || "Não informado"}</Info>
        <Info label="Cidade / UF">{[lead.neighborhood, lead.city, lead.state].filter(Boolean).join(" · ") || "Não informada"}</Info>
        <Info label="Contato">{lead.contact_name || "Não informado"}</Info>
        <Info label="Telefone comercial">{lead.phone ? <a className="inline-flex items-center gap-1.5 hover:text-white" href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`}><Phone className="h-3.5 w-3.5 text-zinc-500" />{lead.phone}</a> : "Não informado"}</Info>
        <Info label="E-mail">{lead.email ? <a className="inline-flex items-center gap-1.5 hover:text-white" href={`mailto:${lead.email}`}><Mail className="h-3.5 w-3.5 text-zinc-500" />{lead.email}</a> : "Não informado"}</Info>
        <Info label="Site">{lead.website ? <a className="inline-flex items-center gap-1.5 hover:text-white" href={withProtocol(lead.website)} target="_blank" rel="noreferrer"><Globe className="h-3.5 w-3.5 text-zinc-500" />{lead.website.replace(/^https?:\/\//, "")}</a> : (lead.website_status || "Não informado")}</Info>
        <Info label="WhatsApp">
          {lead.whatsapp_confirmed && lead.whatsapp ? <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-emerald-300" />{lead.whatsapp} <span className="text-xs text-emerald-300">confirmado</span></span>
            : whatsapp ? <span className="text-zinc-300">Link oficial cadastrado</span>
            : lead.whatsapp ? <span>{lead.whatsapp} <span className="text-xs text-zinc-500">· não confirmado</span></span>
            : "Não confirmado"}
        </Info>
        <Info label="Link oficial de contato">{lead.contact_link ? <a className="inline-flex items-center gap-1.5 hover:text-white" href={withProtocol(lead.contact_link)} target="_blank" rel="noreferrer"><Link2 className="h-3.5 w-3.5 text-zinc-500" /><span className="truncate">{lead.contact_link.replace(/^https?:\/\//, "")}</span></a> : "Não informado"}</Info>
        <Info label="Serviço sugerido">{lead.suggested_service ? `${lead.suggested_service}${lead.suggested_service_detail ? ` — ${lead.suggested_service_detail}` : ""}` : "Não definido"}</Info>
        {lead.marketplace_url ? (
          <>
            <Info label="Loja no Mercado Livre"><a className="inline-flex items-center gap-1.5 hover:text-white" href={withProtocol(lead.marketplace_url)} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 text-zinc-500" /><span className="truncate">{lead.marketplace_url.replace(/^https?:\/\/(www\.)?/, "").slice(0, 48)}</span></a>{lead.marketplace_presence ? <span className={`mt-1 block text-[11px] ${lead.marketplace_presence === "confirmada" ? "text-emerald-300" : "text-amber-300"}`}>Presença {lead.marketplace_presence === "confirmada" ? "confirmada" : "a validar"}</span> : null}</Info>
            <Info label="Anúncios no ML">{lead.marketplace_listings != null ? lead.marketplace_listings.toLocaleString("pt-BR") : "A conferir"}</Info>
          </>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Block label="Sinal observado">{lead.differentiators || "Não informado"}</Block>
        <Block label="Oportunidade comercial">{lead.landing_page_opportunity || "Não informada"}</Block>
      </div>
      {lead.public_source ? <a href={withProtocol(lead.public_source)} target="_blank" rel="noreferrer" className="-mt-2 inline-flex items-center gap-1.5 text-xs text-primary-light hover:underline"><ExternalLink className="h-3.5 w-3.5" /> Fonte pública: {lead.public_source.replace(/^https?:\/\//, "").slice(0, 70)}</a> : <p className="-mt-2 text-xs text-zinc-600">Fonte pública não informada</p>}

      {/* Mensagem */}
      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <Label htmlFor="lead-message" className="mb-0">Mensagem personalizada</Label>
          <div className="flex gap-1">
            <Button variant="ghost" size="sm" onClick={async () => { try { await navigator.clipboard.writeText(message); toast.success("Mensagem copiada"); } catch { toast.error("Não foi possível copiar"); } }} disabled={!message.trim()}><Copy className="h-3.5 w-3.5" /> Copiar</Button>
            <Button variant="secondary" size="sm" onClick={() => saveMessage()} disabled={!messageDirty || updateLead.isPending}>Salvar mensagem</Button>
          </div>
        </div>
        <Textarea id="lead-message" value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escreva a mensagem do primeiro contato" />
        {otherLink ? <a href={otherLink} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"><ExternalLink className="h-3.5 w-3.5" /> Abrir link oficial de contato</a> : null}
      </div>

      {/* Etapa e retorno */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-[#090909] p-4">
          <Label htmlFor="lead-stage">Etapa</Label>
          <Select id="lead-stage" value={lead.status} onChange={(event) => changeStage(event.target.value as LeadStatus)} disabled={updateLead.isPending}><StageOptions current={lead.status} /></Select>
        </div>
        <div className="rounded-xl border border-line bg-[#090909] p-4">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="lead-follow-up">Próximo retorno</Label>
            {bucket ? <span className={cn("mb-2 text-[11px]", bucket === "overdue" ? "text-red-300" : bucket === "today" ? "text-amber-300" : "text-zinc-500")}>{bucket === "overdue" ? "Atrasado" : bucket === "today" ? "Hoje" : "Agendado"}</span> : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input id="lead-follow-up" type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} className="sm:flex-1" />
            <Button onClick={saveFollowUp} disabled={followUps.isPending}><CalendarClock className="h-4 w-4" /> {followUp ? "Reagendar" : "Agendar"}</Button>
          </div>
          {followUp ? <div className="mt-2 flex gap-1"><Button variant="ghost" size="sm" onClick={() => finishFollowUp("complete")}><Check className="h-3.5 w-3.5" /> Concluir retorno</Button><Button variant="ghost" size="sm" className="text-zinc-500" onClick={() => finishFollowUp("cancel")}><X className="h-3.5 w-3.5" /> Remover</Button></div> : null}
        </div>
      </div>

      {/* Conversa do WhatsApp e assistente de IA */}
      <ConversationPanel lead={lead} />

      {/* Notas */}
      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <Label htmlFor="lead-notes" className="mb-0">Notas de acompanhamento</Label>
          <Button variant="secondary" size="sm" onClick={saveNotes} disabled={!notesDirty || updateLead.isPending}>Salvar notas</Button>
        </div>
        <Textarea id="lead-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-20" placeholder="Registre o que foi conversado e o próximo passo" />
      </div>

      <p className="border-t border-line pt-4 text-xs text-zinc-600">Cadastrado em {formatDate(lead.created_at, true)}{lead.source ? ` · ${lead.source}` : ""}</p>
    </div>
  );
}
