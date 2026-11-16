import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { extractSiteContacts, type SiteContacts } from "@/features/lead-finder/parsing";

const EMPTY: SiteContacts = { whatsapps: [], phones: [], emails: [], instagram: null };

function isPrivateAddress(address: string) {
  if (isIP(address) === 6) {
    const lower = address.toLowerCase();
    return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower.startsWith("::ffff:");
  }
  const [a, b] = address.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

/** Só sites públicos: bloqueia localhost, IPs internos e portas fora do padrão (proteção contra SSRF). */
async function safeUrl(site: string) {
  let url: URL;
  try { url = new URL(/^https?:/i.test(site) ? site : `https://${site}`); } catch { return null; }
  if (!/^https?:$/.test(url.protocol) || (url.port && !["80", "443"].includes(url.port))) return null;
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(url.hostname) || /mercadoli[vb]re|instagram|facebook|wa\.me|whatsapp/i.test(url.hostname)) return null;
  if (isIP(url.hostname)) return null;
  try {
    const addresses = await lookup(url.hostname, { all: true });
    if (!addresses.length || addresses.some((item) => isPrivateAddress(item.address))) return null;
  } catch { return null; }
  return url;
}

/** Lê apenas a página inicial do site oficial e devolve os contatos publicados (sem custo de API). */
export async function fetchSiteContacts(site: string | null): Promise<SiteContacts> {
  if (!site) return EMPTY;
  const url = await safeUrl(site);
  if (!url) return EMPTY;
  try {
    const response = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(8_000), headers: { "user-agent": "Mozilla/5.0 (compatible; LynkProspect/3.2)", accept: "text/html" } });
    if (!response.ok || !(response.headers.get("content-type") || "").includes("html")) return EMPTY;
    // Redirecionamento para endereço interno também é bloqueado.
    if (response.url && response.url !== url.toString() && !(await safeUrl(response.url))) return EMPTY;
    const html = (await response.text()).slice(0, 1_500_000);
    return extractSiteContacts(html);
  } catch {
    return EMPTY;
  }
}
