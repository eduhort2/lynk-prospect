/**
 * Regras puras da busca de leads (sem rede), portadas do Lynk CRM:
 * agrupamento de resultados do Mercado Livre, conferência de nome e leitura de contatos em HTML.
 */
import { normPhoneBR } from "@/features/leads/phone";

export type OrganicResult = { title: string; link: string; snippet: string };

const NON_COMPANY_DOMAINS = [
  "mercadolivre.com.br", "mercadolibre.com", "mercadolivre.com", "mlstatic.com", "instagram.com", "facebook.com", "wa.me", "whatsapp.com",
  "linktr.ee", "youtube.com", "tiktok.com", "shopee.com.br", "amazon.com.br", "magazineluiza.com.br", "google.com", "linkedin.com",
];

export function hostOf(url: string | null | undefined) {
  if (!url) return null;
  try { return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

/** Domínio próprio da empresa (ignora marketplaces e redes sociais). */
export function companyDomain(url: string | null | undefined) {
  const host = hostOf(url);
  if (!host || NON_COMPANY_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))) return null;
  return host;
}

/**
 * Identificador da loja/vendedor a partir de uma URL do Mercado Livre.
 * /loja/{slug} → "loja:{slug}", perfil.mercadolivre.com.br/{NICK} → "perfil:{nick}", _CustId_{n} → "custid:{n}".
 * Anúncios isolados não identificam o vendedor e retornam null.
 */
export function mlStoreIdFromUrl(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(/^https?:/i.test(url) ? url : `https://${url}`);
    const host = parsed.hostname.toLowerCase();
    if (!host.endsWith("mercadolivre.com.br")) return null;
    const segments = parsed.pathname.split("/").filter(Boolean);
    if (segments[0] === "loja" && segments[1]) return `loja:${decodeURIComponent(segments[1]).toLowerCase()}`;
    if (host.startsWith("perfil.") && segments[0]) return `perfil:${decodeURIComponent(segments[0]).toLowerCase()}`;
    const customer = parsed.pathname.match(/_CustId_(\d+)/i);
    return customer ? `custid:${customer[1]}` : null;
  } catch { return null; }
}

function cleanTitle(title: string) {
  return title
    .replace(/\s*[|\-–]\s*[\w.]*mercadoli[vb]re\.com(\.br)?\s*$/i, "")
    .replace(/\s*[|\-–]\s*Mercado Livre.*$/i, "")
    .replace(/\s*[|\-–]\s*Loja oficial\s*$/i, "")
    .replace(/^Loja oficial\s+/i, "")
    .replace(/\s*-\s*Loja.*$/i, "")
    .replace(/\s+no Mercado Livre.*$/i, "")
    .trim();
}

/** Quantidade de anúncios quando o texto do resultado informa (ex.: "1.234 resultados", "350 produtos"). */
export function listingsFromText(text: string) {
  const match = text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)\s+(?:an[uú]ncios|produtos|resultados|itens)\b/i);
  if (!match) return null;
  const value = Number(match[1].replace(/\D/g, ""));
  return Number.isFinite(value) ? value : null;
}

export type MlStore = {
  key: string;
  name: string;
  storeId: string | null;
  url: string;
  presence: "confirmada" | "a_validar";
  reason: string;
  snippet: string;
  listings: number | null;
};

const normName = (value: string) => value.replace(/\(.*?\)/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Agrupa resultados por loja. Só a página de loja/perfil do ML confirma a presença; anúncios isolados ficam "a validar". */
export function groupMercadoLivreResults(results: OrganicResult[]): MlStore[] {
  const groups = new Map<string, MlStore>();
  const byName = new Map<string, string>();
  for (const result of results) {
    if (!result.link || !/mercadoli[vb]re\.com/i.test(result.link)) continue;
    const storeId = mlStoreIdFromUrl(result.link);
    const text = `${result.title} ${result.snippet}`;
    let key: string;
    let name: string;
    let presence: MlStore["presence"];
    let reason: string;
    if (storeId) {
      key = `ml:${storeId}`;
      name = cleanTitle(result.title) || storeId.split(":")[1];
      presence = "confirmada";
      reason = "Página de loja/perfil do vendedor no Mercado Livre.";
    } else {
      const official = text.match(/Loja oficial\s+([A-ZÀ-Ú0-9][\wÀ-ú&.\- ]{1,40}?)(?:[.,|]|\s{2}|$)/i);
      const soldBy = text.match(/Vendido por\s+([\wÀ-ú&.\-]{2,40})/i);
      if (official) {
        name = official[1].trim();
        key = `nome:${name.toLowerCase()}`;
        presence = "confirmada";
        reason = `Anúncio com selo "Loja oficial ${name}".`;
      } else if (soldBy) {
        name = soldBy[1];
        key = `nome:${soldBy[1].toLowerCase()}`;
        presence = "a_validar";
        reason = `Anúncio cita o vendedor "${soldBy[1]}". Abra o perfil para confirmar.`;
      } else {
        continue; // anúncio sem vendedor identificado não vira lead
      }
    }
    const normalized = normName(name);
    if (normalized && byName.has(normalized) && !groups.has(key)) key = byName.get(normalized)!;
    const current = groups.get(key);
    const listings = listingsFromText(text);
    if (!current) {
      if (normalized) byName.set(normalized, key);
      groups.set(key, { key, name, storeId, url: result.link, presence, reason, snippet: result.snippet, listings });
    } else {
      if (current.presence === "a_validar" && presence === "confirmada") Object.assign(current, { presence, reason, url: result.link, storeId: storeId ?? current.storeId });
      if (current.listings === null && listings !== null) current.listings = listings;
    }
  }
  return [...groups.values()];
}

const GENERIC = new Set(["auto", "autos", "pecas", "peca", "autopecas", "loja", "lojas", "oficial", "ltda", "me", "eireli", "comercio", "distribuidora",
  "store", "shop", "brasil", "br", "de", "da", "do", "das", "dos", "e", "the", "acessorios", "comercial", "industria", "importadora", "atacado", "varejo"]);

const plain = (value: string) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palavras que distinguem a empresa (ex.: "circular" em "CIRCULAR AUTOPEÇAS"). */
export function distinctiveTokens(name: string) {
  const all = plain(name).replace(/\(.*?\)/g, " ").split(/[^a-z0-9]+/).filter((token) => token.length >= 3 || (token.length === 2 && /\d/.test(token)));
  const distinct = all.filter((token) => !GENERIC.has(token));
  return distinct.length ? distinct : all;
}

/** 0..1: quanto das palavras distintivas aparece no texto. */
export function nameMatch(name: string, text: string) {
  const tokens = distinctiveTokens(name);
  const haystack = plain(text).replace(/[^a-z0-9]/g, "");
  return tokens.length ? tokens.filter((token) => haystack.includes(token)).length / tokens.length : 0;
}

export type SiteContacts = { whatsapps: string[]; phones: string[]; emails: string[]; instagram: string | null };

/** Contatos publicados no HTML do site oficial: links wa.me (WhatsApp oficial), tel:, mailto: e Instagram. */
export function extractSiteContacts(html: string): SiteContacts {
  const out: SiteContacts = { whatsapps: [], phones: [], emails: [], instagram: null };
  const add = (list: string[], value: string | null) => { if (value && !list.includes(value)) list.push(value); };
  for (const match of html.matchAll(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?(?:[^"'\s>]*&)?phone=|web\.whatsapp\.com\/send\?(?:[^"'\s>]*&)?phone=)(\+?\d{10,13})/gi)) add(out.whatsapps, normPhoneBR(match[1]));
  for (const match of html.matchAll(/href=["']tel:([+\d\s().-]{10,20})["']/gi)) add(out.phones, normPhoneBR(match[1]));
  for (const match of html.matchAll(/mailto:([^"'?\s>]+)/gi)) {
    const email = decodeURIComponent(match[1]).trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email)) add(out.emails, email);
  }
  const instagram = html.match(/https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]{2,30})\/?["'?]/);
  if (instagram && !["p", "reel", "explore", "stories"].includes(instagram[1].toLowerCase())) out.instagram = `https://www.instagram.com/${instagram[1]}`;
  return out;
}

/** "Rua X, 123 - Centro, Curitiba - PR, 80000-000" → { city: "Curitiba", state: "PR", neighborhood: "Centro" } */
export function parseBrazilAddress(address: string | null) {
  if (!address) return { city: null, state: null, neighborhood: null };
  const cityState = address.match(/([^,]+?)\s*-\s*([A-Z]{2})(?:,\s*\d{5}-?\d{3})?\s*$/) || address.match(/([^,]+?)\s*-\s*([A-Z]{2}),/);
  const neighborhood = address.match(/-\s*([^,]+?),\s*[^,]+?\s*-\s*[A-Z]{2}/);
  return { city: cityState?.[1]?.trim() || null, state: cityState?.[2] || null, neighborhood: neighborhood?.[1]?.trim() || null };
}
