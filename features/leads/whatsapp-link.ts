import type { Lead } from "@/types";
import { normPhoneBR } from "./phone";

const OFFICIAL_HOSTS = new Set(["wa.me", "api.whatsapp.com", "web.whatsapp.com", "whatsapp.com"]);

function digits(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

/** Números brasileiros sem DDI (10 ou 11 dígitos) recebem o 55. */
export function normalizeWhatsAppNumber(value?: string | null) {
  const only = digits(value);
  if (only.length === 10 || only.length === 11) return `55${only}`;
  return only;
}

function parseUrl(value?: string | null) {
  const text = (value || "").trim();
  if (!text) return null;
  try {
    return new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    return null;
  }
}

/** Link oficial do WhatsApp: wa.me, api.whatsapp.com, web.whatsapp.com ou whatsapp.com. */
export function isOfficialWhatsAppLink(value?: string | null) {
  const url = parseUrl(value);
  if (!url) return false;
  return OFFICIAL_HOSTS.has(url.hostname.toLowerCase().replace(/^www\./, ""));
}

function phoneFromOfficialLink(url: URL) {
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "wa.me") {
    const first = url.pathname.split("/").filter(Boolean)[0] || "";
    return /^\+?\d{10,15}$/.test(first) ? digits(first) : "";
  }
  return digits(url.searchParams.get("phone"));
}

export type WhatsAppTarget = {
  url: string;
  /** false quando o link oficial não permite anexar texto (ex.: wa.me/message/...). */
  messageIncluded: boolean;
  origin: "confirmed_number" | "official_link";
};

/**
 * Só existe destino de WhatsApp quando há número confirmado ou link oficial.
 * Telefone comum (campo phone, ou whatsapp sem confirmação) nunca gera link.
 */
export function getWhatsAppTarget(
  lead: Pick<Lead, "whatsapp" | "whatsapp_confirmed" | "contact_link">,
  message?: string | null,
): WhatsAppTarget | null {
  const text = (message || "").trim();
  const query = text ? `?text=${encodeURIComponent(text)}` : "";

  const confirmed = lead.whatsapp_confirmed ? normalizeWhatsAppNumber(lead.whatsapp) : "";
  if (confirmed.length >= 12 && confirmed.length <= 15) {
    return { url: `https://wa.me/${confirmed}${query}`, messageIncluded: true, origin: "confirmed_number" };
  }

  if (isOfficialWhatsAppLink(lead.contact_link)) {
    const url = parseUrl(lead.contact_link)!;
    const phone = phoneFromOfficialLink(url);
    if (phone) return { url: `https://wa.me/${normalizeWhatsAppNumber(phone)}${query}`, messageIncluded: true, origin: "official_link" };
    return { url: url.toString(), messageIncluded: !text, origin: "official_link" };
  }

  return null;
}

/** Link de contato oficial que não é WhatsApp (Instagram, formulário, site...). */
export function getOtherContactLink(lead: Pick<Lead, "contact_link">) {
  if (!lead.contact_link || isOfficialWhatsAppLink(lead.contact_link)) return null;
  const url = parseUrl(lead.contact_link);
  return url ? url.toString() : null;
}

/**
 * "Provável WhatsApp": celular (DDD + 9) ainda não confirmado, no campo WhatsApp ou no telefone.
 * Só existe quando NÃO há WhatsApp confirmado/link oficial. Telefone fixo nunca entra aqui.
 */
export function getProbableWhatsApp(
  lead: Pick<Lead, "whatsapp" | "whatsapp_confirmed" | "contact_link" | "phone">,
  message?: string | null,
): { url: string; number: string } | null {
  if (getWhatsAppTarget(lead)) return null;
  const number = [lead.whatsapp, lead.phone].map(normPhoneBR).find((value) => value && value.length === 13);
  if (!number) return null;
  const text = (message || "").trim();
  return { url: `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`, number };
}

/** Usuário do Instagram a partir do campo Instagram (URL ou @) ou do link oficial de contato. */
export function instagramHandle(lead: Pick<Lead, "instagram" | "contact_link">) {
  for (const value of [lead.instagram, lead.contact_link]) {
    const text = (value || "").trim();
    if (!text) continue;
    const fromUrl = text.match(/(?:instagram\.com|ig\.me\/m)\/([A-Za-z0-9_.]{1,30})/i);
    if (fromUrl && !["p", "reel", "reels", "explore", "stories", "accounts"].includes(fromUrl[1].toLowerCase())) return fromUrl[1];
    if (value === lead.instagram && /^@?[A-Za-z0-9_.]{1,30}$/.test(text)) return text.replace(/^@/, "");
  }
  return null;
}

/** Abre a conversa direta (Direct) do Instagram. O Instagram não aceita texto pré-preenchido. */
export function getInstagramTarget(lead: Pick<Lead, "instagram" | "contact_link">) {
  const handle = instagramHandle(lead);
  return handle ? { url: `https://ig.me/m/${handle}`, handle } : null;
}

/** Mesmo critério da coluna has_message_channel (migração 008): WhatsApp (confirmado ou celular) ou Instagram. */
export function hasMessageChannel(lead: Pick<Lead, "whatsapp" | "whatsapp_confirmed" | "contact_link" | "phone" | "instagram">) {
  return Boolean(getWhatsAppTarget(lead) || getProbableWhatsApp(lead) || getInstagramTarget(lead));
}

export function hasWhatsApp(lead: Pick<Lead, "whatsapp" | "whatsapp_confirmed" | "contact_link">) {
  return Boolean(getWhatsAppTarget(lead));
}
