"use client";

import { toast } from "sonner";
import type { Lead, LeadStatus } from "@/types";
import { stageLabel, stageOf } from "./stages";
import { useUpdateLead } from "./use-leads";
import { getInstagramTarget, getProbableWhatsApp, getWhatsAppTarget } from "./whatsapp-link";

export type ContactChannel = "whatsapp" | "whatsapp_probable" | "instagram";

/**
 * Abre a conversa (WhatsApp ou Instagram) e já move o lead de "Novo" para "Contatado",
 * registrando a data do contato. Leads em etapa mais avançada mantêm a etapa.
 */
export function useContactLead() {
  const updateLead = useUpdateLead();

  async function contact(lead: Lead, channel: ContactChannel, message = lead.message) {
    const text = (message || "").trim();
    const target = channel === "instagram"
      ? getInstagramTarget(lead)
      : channel === "whatsapp" ? getWhatsAppTarget(lead, text) : getProbableWhatsApp(lead, text);
    if (!target) return false;

    // Abre no mesmo clique (antes de qualquer await) para o navegador não bloquear como pop-up.
    window.open(target.url, "_blank", "noopener,noreferrer");

    const needsCopy = channel === "instagram" || ("messageIncluded" in target && target.messageIncluded === false);
    if (needsCopy && text) {
      try { await navigator.clipboard.writeText(text); } catch { /* sem permissão de cópia */ }
    }

    const moveStage = stageOf(lead.status) === "Novo";
    try {
      await updateLead.mutateAsync({
        id: lead.id,
        values: {
          contacted_at: new Date().toISOString(),
          ...(moveStage ? { status: "Contato enviado" as LeadStatus } : {}),
          ...(text !== (lead.message || "").trim() ? { message: text } : {}),
        },
        previousStatus: lead.status,
      });
      const where = channel === "instagram" ? "Instagram" : "WhatsApp";
      toast.success(moveStage ? `${where} aberto · ${lead.company_name} movido para Contatado` : `${where} aberto · contato registrado`, {
        description: needsCopy && text ? "A mensagem foi copiada: cole na conversa." : moveStage ? undefined : `Etapa mantida: ${stageLabel(lead.status)}`,
      });
    } catch (error) {
      toast.error("A conversa foi aberta, mas o lead não foi atualizado", { description: error instanceof Error ? error.message : "Tente novamente." });
    }
    return true;
  }

  return { contact, isPending: updateLead.isPending };
}
