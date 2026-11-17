import { z } from "zod";
import { FINDER_SERVICES, leadFromMlStore, leadFromPlace, type FinderLead, type PlaceInfo } from "@/features/lead-finder/build-lead";
import { groupMercadoLivreResults, nameMatch, type MlStore } from "@/features/lead-finder/parsing";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { defaultEngine, mapsSearch, serpapiConfigured, webSearch, type SearchEngine } from "@/lib/integrations/serpapi";
import { fetchSiteContacts } from "@/lib/integrations/site-contacts";
import { createAdminSupabase } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const schema = z.object({
  service: z.enum(FINDER_SERVICES),
  serviceDetail: z.string().trim().max(120).optional().default(""),
  niche: z.string().trim().min(2, "Informe o nicho ou as palavras-chave").max(100),
  region: z.string().trim().max(120).optional().default(""),
  quantity: z.coerce.number().int().min(1).max(30),
  websiteFilter: z.enum(["all", "with", "without"]).default("all"),
  /** Só cria leads que dão para chamar por WhatsApp (confirmado ou celular) ou Instagram. */
  onlyWithChannel: z.boolean().default(true),
}).superRefine((value, ctx) => {
  if (value.service === "Outro" && !value.serviceDetail) ctx.addIssue({ code: "custom", path: ["serviceDetail"], message: "Especifique o serviço em “Outro”." });
  if (value.service !== "Loja no Mercado Livre" && value.region.length < 2) ctx.addIssue({ code: "custom", path: ["region"], message: "Informe a cidade ou região." });
});
type Input = z.infer<typeof schema>;

/** O que aconteceu na busca, para explicar um resultado vazio e para o histórico. */
type Diagnostics = { engine?: SearchEngine | "google_maps"; query?: string; rawResults: number; candidates: number; note?: string };

/** Executa tarefas com no máximo `limit` ao mesmo tempo. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await task(items[index]); }
  }));
  return results;
}

async function findLocalBusinesses(input: Input, diagnostics: Diagnostics) {
  const query = `${input.niche} em ${input.region}`;
  // Busca mais do que o pedido para compensar os filtros (site e canal de mensagem).
  const factor = (input.websiteFilter === "all" ? 1 : 2) * (input.onlyWithChannel ? 2 : 1);
  const places = await mapsSearch(query, Math.min(60, input.quantity * factor));
  const filtered = places.filter((place) => input.websiteFilter === "all" || (input.websiteFilter === "with" ? Boolean(place.website) : !place.website));
  Object.assign(diagnostics, { engine: "google_maps", query, rawResults: places.length, candidates: filtered.length });
  if (!places.length) diagnostics.note = "O Google Maps não retornou empresas para esse nicho e região.";
  else if (!filtered.length) diagnostics.note = `O Google Maps retornou ${places.length} empresas, mas nenhuma passou no filtro de site.`;
  // Lê os sites só até completar a quantidade pedida com leads que tenham canal.
  const leads: FinderLead[] = [];
  for (let start = 0; start < filtered.length && leads.length < input.quantity; start += 5) {
    const batch = await pool(filtered.slice(start, start + 5), 5, async (place) => leadFromPlace(place, await fetchSiteContacts(place.website), input));
    leads.push(...batch.filter((lead) => !input.onlyWithChannel || leadHasChannel(lead)));
  }
  return leads.slice(0, input.quantity);
}

async function findMercadoLivreStores(input: Input, diagnostics: Diagnostics) {
  // A região não entra na pesquisa web (o Google ignora e reduz os resultados); ela é usada
  // para encontrar o contato da loja no Google Maps.
  const query = `site:mercadolivre.com.br/loja ${input.niche}`.replace(/\s+/g, " ").trim();
  const limit = Math.min(30, Math.max(10, input.quantity * 2));
  const first = defaultEngine();
  let engine: SearchEngine = first;
  let organic = await webSearch(query, limit, engine);
  let stores: MlStore[] = groupMercadoLivreResults(organic);
  if (!stores.length) {
    // Reserva: o outro motor (os motores mudam o suporte ao operador site: sem aviso).
    engine = first === "google" ? "bing" : "google";
    organic = await webSearch(query, limit, engine);
    stores = groupMercadoLivreResults(organic);
  }
  Object.assign(diagnostics, { engine, query, rawResults: organic.length, candidates: stores.length });
  if (!organic.length) diagnostics.note = "A pesquisa web não retornou resultados para esse nicho.";
  else if (!stores.length) diagnostics.note = `A pesquisa web retornou ${organic.length} resultados, mas nenhum era página de loja do Mercado Livre. Tente palavras mais genéricas.`;
  const leads = await pool(stores.slice(0, Math.min(input.quantity, 20)), 4, async (store) => {
    // 1 crédito por loja: procura a mesma empresa no Google Maps e só aceita se o nome conferir.
    let place: PlaceInfo | null = null;
    try {
      const places = await mapsSearch(`${store.name} ${input.region}`.trim(), 5);
      place = places.find((item) => nameMatch(store.name, item.title) === 1) || null;
    } catch { place = null; }
    return leadFromMlStore(store, place, await fetchSiteContacts(place?.website || null), input);
  });
  return input.onlyWithChannel ? leads.filter(leadHasChannel) : leads;
}

/** Lead da busca que dá para chamar: WhatsApp (confirmado ou celular), link oficial de WhatsApp ou Instagram. */
function leadHasChannel(lead: FinderLead) {
  return Boolean(lead.whatsapp || lead.instagram || (lead.contact_link && /wa\.me\/|whatsapp\.com|instagram\.com\/|ig\.me\//i.test(lead.contact_link)));
}

export async function POST(request: Request) {
  let jobId: string | null = null;
  try {
    const access = await requireOrganizationAccess();
    const input = schema.parse(await request.json());
    if (!serpapiConfigured()) return Response.json({ error: "A busca automática não está configurada. Cadastre SERPAPI_API_KEY nas variáveis de ambiente." }, { status: 503 });

    const { error: rateError } = await access.supabase.rpc("check_api_rate_limit", { target_organization_id: access.organizationId, requested_action: "generate_prospecting" });
    if (rateError) return Response.json({ error: "Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente." }, { status: 429 });

    // Confere o saldo antes de gastar a SerpApi; a cobrança acontece só pelos leads novos.
    const { data: usage, error: usageError } = await access.supabase.rpc("prospecting_usage", { target_organization_id: access.organizationId });
    const balance = (Array.isArray(usage) ? usage[0] : usage) as { monthly_limit?: number; remaining?: number } | null;
    if (usageError || !balance || !balance.monthly_limit) return Response.json({ error: "Seu plano não inclui busca automática de leads." }, { status: 402 });
    if ((balance.remaining ?? 0) < 1) return Response.json({ error: "O limite mensal de buscas do plano foi atingido." }, { status: 402 });

    const { data: job, error: jobError } = await access.supabase.from("prospecting_jobs").insert({
      organization_id: access.organizationId,
      user_id: access.user.id,
      region: input.region || "Brasil",
      niche: input.niche,
      requested_quantity: input.quantity,
      status: "running",
      provider: "serpapi",
      filters: { service: input.service, serviceDetail: input.serviceDetail, website: input.websiteFilter },
    }).select("id").single();
    if (jobError) throw jobError;
    jobId = job.id;

    const diagnostics: Diagnostics = { rawResults: 0, candidates: 0 };
    const found: FinderLead[] = input.service === "Loja no Mercado Livre" ? await findMercadoLivreStores(input, diagnostics) : await findLocalBusinesses(input, diagnostics);
    const unique = [...new Map(found.map((lead) => [lead.import_key, lead])).values()];
    if (!found.length && diagnostics.candidates > 0 && input.onlyWithChannel) {
      diagnostics.note = `Foram encontradas ${diagnostics.candidates} empresas, mas nenhuma com WhatsApp ou Instagram. Tente outro nicho ou desmarque “Só com WhatsApp ou Instagram”.`;
    }

    // Leads já cadastrados não são alterados (etapa, notas e mensagem preservadas).
    const keys = unique.map((lead) => lead.import_key);
    const { data: existing, error: existingError } = keys.length
      ? await access.supabase.from("leads").select("id,company_name,import_key").eq("organization_id", access.organizationId).in("import_key", keys)
      : { data: [], error: null };
    if (existingError) throw existingError;
    const existingKeys = new Set((existing || []).map((row) => row.import_key));
    const fresh = unique.filter((lead) => !existingKeys.has(lead.import_key)).slice(0, Math.max(0, balance.remaining ?? 0));

    let inserted: Array<{ id: string; company_name: string; import_key: string }> = [];
    if (fresh.length) {
      const { error: quotaError } = await access.supabase.rpc("reserve_prospecting_credits", { target_organization_id: access.organizationId, requested: fresh.length });
      if (quotaError) return Response.json({ error: quotaError.message.includes("QUOTA_EXCEEDED") ? "O limite mensal de buscas do plano foi atingido." : "Não foi possível reservar os créditos da busca." }, { status: 402 });
      const rows = fresh.map((lead) => ({ ...lead, organization_id: access.organizationId, responsible_user: access.user.id, prospecting_job_id: job.id }));
      const { data, error } = await access.supabase.from("leads").upsert(rows, { onConflict: "organization_id,import_key", ignoreDuplicates: true }).select("id,company_name,import_key");
      if (error) throw error;
      inserted = data || [];
    }

    await access.supabase.from("prospecting_jobs").update({
      status: "completed",
      generated_quantity: inserted.length,
      completed_at: new Date().toISOString(),
      filters: { service: input.service, serviceDetail: input.serviceDetail, website: input.websiteFilter, diagnostics },
    }).eq("id", job.id);
    try {
      await createAdminSupabase().from("audit_logs").insert({ organization_id: access.organizationId, user_id: access.user.id, action: "lead_finder.completed", entity_type: "prospecting_job", entity_id: job.id, metadata: { service: input.service, found: found.length, imported: inserted.length, diagnostics } });
    } catch { /* auditoria opcional (exige SUPABASE_SERVICE_ROLE_KEY) */ }

    const byKey = new Map(unique.map((lead) => [lead.import_key, lead]));
    const summarize = (row: { id: string; company_name: string; import_key: string }) => {
      const lead = byKey.get(row.import_key);
      return { id: row.id, company_name: row.company_name, city: lead?.city || null, state: lead?.state || null, phone: lead?.phone || null, whatsapp: lead?.whatsapp || null, whatsapp_confirmed: lead?.whatsapp_confirmed || false, instagram: lead?.instagram || null, website: lead?.website || null, marketplace_url: lead?.marketplace_url || null, marketplace_listings: lead?.marketplace_listings ?? null };
    };
    return Response.json({ jobId: job.id, found: found.length, imported: inserted.map(summarize), existing: (existing || []).map(summarize), diagnostics });
  } catch (error) {
    if (jobId) {
      try {
        const access = await requireOrganizationAccess();
        await access.supabase.from("prospecting_jobs").update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 300) : "Falha na busca", completed_at: new Date().toISOString() }).eq("id", jobId);
      } catch { /* preserva o erro original */ }
    }
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    if (error instanceof Error && error.message.startsWith("SERPAPI:")) return Response.json({ error: `A busca externa falhou: ${error.message.slice(9, 200)}` }, { status: 502 });
    return accessErrorResponse(error);
  }
}
