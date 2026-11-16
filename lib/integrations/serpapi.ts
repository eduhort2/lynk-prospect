import "server-only";

/**
 * SerpApi (mesmo provedor do Lynk CRM). A chave fica só no servidor (SERPAPI_API_KEY).
 * Cada página de resultados consome 1 crédito da SerpApi.
 * SERPAPI_BASE_URL existe apenas para testes locais com respostas simuladas.
 */

export type Organic = { title: string; link: string; snippet: string };
export type MapsPlace = {
  title: string;
  phone: string | null;
  website: string | null;
  address: string | null;
  type: string | null;
  placeId: string | null;
  mapsUrl: string;
  rating: number | null;
  reviews: number | null;
};

export type SearchEngine = "bing" | "google";

export function serpapiConfigured() {
  return Boolean(process.env.SERPAPI_API_KEY);
}

function baseUrl() {
  return process.env.SERPAPI_BASE_URL || "https://serpapi.com/search.json";
}

async function call(params: Record<string, string>) {
  const url = new URL(baseUrl());
  Object.entries({ ...params, api_key: process.env.SERPAPI_API_KEY || "" }).forEach(([key, value]) => url.searchParams.set(key, value));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(30_000) });
  const json = await response.json().catch(() => ({} as Record<string, unknown>));
  const error = typeof json.error === "string" ? json.error : null;
  if (error && /hasn't returned any results/i.test(error)) return { ...json, empty: true };
  if (!response.ok || error) throw new Error(`SERPAPI: ${error || `HTTP ${response.status}`}`);
  return json as Record<string, unknown> & { empty?: boolean };
}

/** Pesquisa web. Bing é o padrão: o Google via SerpApi passou a ignorar "site:mercadolivre.com.br/loja". */
export async function webSearch(query: string, limit: number, engine: SearchEngine = process.env.SERPAPI_ENGINE === "google" ? "google" : "bing"): Promise<Organic[]> {
  const out: Organic[] = [];
  for (let start = 0; start < limit; start += 10) {
    const params: Record<string, string> = engine === "bing"
      ? { engine: "bing", q: query, cc: "BR", mkt: "pt-BR", count: "10", first: String(start + 1) }
      : { engine: "google", q: query, google_domain: "google.com.br", gl: "br", hl: "pt-br", num: "10", start: String(start), nfpr: "1" };
    const json = await call(params);
    const page = ((json.organic_results as Array<Record<string, string>> | undefined) || []).map((item) => ({ title: item.title || "", link: item.link || "", snippet: item.snippet || "" })).filter((item) => item.link);
    out.push(...page);
    if (json.empty || page.length < 10 || !json.serpapi_pagination) break;
  }
  return out.slice(0, limit);
}

/** Google Maps: empresas locais com telefone, site e endereço. Até 20 por página. */
export async function mapsSearch(query: string, limit = 20): Promise<MapsPlace[]> {
  const out: MapsPlace[] = [];
  for (let start = 0; start < limit; start += 20) {
    const json = await call({ engine: "google_maps", type: "search", q: query, hl: "pt-br", gl: "br", ...(start ? { start: String(start) } : {}) });
    const list = (json.local_results as Array<Record<string, unknown>> | undefined) || (json.place_results ? [json.place_results as Record<string, unknown>] : []);
    for (const place of list) {
      const title = String(place.title || "");
      const address = place.address ? String(place.address) : null;
      out.push({
        title,
        phone: place.phone ? String(place.phone) : null,
        website: place.website ? String(place.website) : null,
        address,
        type: place.type ? String(place.type) : null,
        placeId: place.place_id ? String(place.place_id) : null,
        mapsUrl: place.place_id
          ? `https://www.google.com/maps/place/?q=place_id:${place.place_id}`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${title} ${address || ""}`.trim())}`,
        rating: typeof place.rating === "number" ? place.rating : null,
        reviews: typeof place.reviews === "number" ? place.reviews : null,
      });
    }
    if (json.empty || list.length < 20) break;
  }
  return out.slice(0, limit);
}
