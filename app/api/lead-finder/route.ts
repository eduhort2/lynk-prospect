import { z } from "zod";
import { FINDER_SERVICES, leadFromMlStore, leadFromPlace, type FinderLead, type PlaceInfo } from "@/features/lead-finder/build-lead";
import { groupMercadoLivreResults, nameMatch } from "@/features/lead-finder/parsing";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { mapsSearch, serpapiConfigured, webSearch } from "@/lib/integrations/serpapi";
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
}).superRefine((value, ctx) => {
  if (value.service === "Outro" && !value.serviceDetail) ctx.addIssue({ code: "custom", path: ["serviceDetail"], message: "Especifique o serviço em “Outro”." });
  if (value.service !== "Loja no Mercado Livre" && value.region.length < 2) ctx.addIssue({ code: "custom", path: ["region"], message: "Informe a cidade ou região." });
});

/** Executa tarefas com no máximo `limit` ao mesmo tempo. */
async function pool<T, R>(items: T[], limit: number, task: (item: T) => Promise<R>) {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) { const index = next++; results[index] = await task(items[index]); }
  }));
  return results;
}

async function findLocalBusinesses(input: z.infer<typeof schema>) {
  // Busca mais do que o pedido para compensar o filtro de site.
  const places = await mapsSearch(`${input.niche} em ${input.region}`, Math.min(60, input.websiteFilter === "all" ? input.quantity : input.quantity * 2));
  const filtered = places.filter((place) => input.websiteFilter === "all" || (input.websiteFilter === "with" ? Boolean(place.website) : !place.website)).slice(0, input.quantity);
  return pool(filtered, 5, async (place) => leadFromPlace(place, await fetchSiteContacts(place.website), input));
}

async function findMercadoLivreStores(input: z.infer<typeof schema>) {
  const query = `site:mercadolivre.com.br/loja ${input.niche} ${input.region}`.replace(/\s+/g, " ").trim();
  const organic = await webSearch(query, Math.min(30, Math.max(10, input.quantity * 2)));
  const stores = groupMercadoLivreResults(organic).slice(0, Math.min(input.quantity, 20));
  return pool(stores, 4, async (store) => {
    // 1 crédito por loja: procura a mesma empresa no Google Maps e só aceita se o nome conferir.
    let place: PlaceInfo | null = null;
    try {
      const places = await mapsSearch(`${store.name} ${input.region}`.trim(), 5);
      place = places.find((item) => nameMatch(store.name, item.title) === 1) || null;
    } catch { place = null; }
    return leadFromMlStore(store, place, await fetchSiteContacts(place?.website || null), input);
  });
}

export async function POST(request: Request) {
  let jobId: string | null = null;
  let reserved = 0;
  let organizationId: string | null = null;
  let userId: string | null = null;
  try {
    const access = await requireOrganizationAccess();
    organizationId = access.organizationId;
    userId = access.user.id;
    const input = schema.parse(await request.json());
    if (!serpapiConfigured()) return Response.json({ error: "A busca automática não está configurada. Cadastre SERPAPI_API_KEY nas variáveis de ambiente." }, { status: 503 });

    const { error: rateError } = await access.supabase.rpc("check_api_rate_limit", { target_organization_id: access.organizationId, requested_action: "generate_prospecting" });
    if (rateError) return Response.json({ error: "Muitas buscas em pouco tempo. Aguarde um minuto e tente novamente." }, { status: 429 });

    const { error: quotaError } = await access.supabase.rpc("reserve_prospecting_credits", { target_organization_id: access.organizationId, requested: input.quantity });
    if (quotaError) {
      const message = quotaError.message.includes("PLAN_REQUIRED") ? "Seu plano não inclui busca automática de leads." : quotaError.message.includes("QUOTA_EXCEEDED") ? "O limite mensal de buscas do plano foi atingido." : "Não foi possível reservar os créditos da busca.";
      return Response.json({ error: message }, { status: 402 });
    }
    reserved = input.quantity;

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

    const found: FinderLead[] = input.service === "Loja no Mercado Livre" ? await findMercadoLivreStores(input) : await findLocalBusinesses(input);
    const unique = [...new Map(found.map((lead) => [lead.import_key, lead])).values()];
    const rows = unique.map((lead) => ({ ...lead, organization_id: access.organizationId, responsible_user: access.user.id, prospecting_job_id: job.id }));

    // Leads já cadastrados não são alterados (etapa, notas e mensagem preservadas).
    const { data: inserted, error: insertError } = rows.length
      ? await access.supabase.from("leads").upsert(rows, { onConflict: "organization_id,import_key", ignoreDuplicates: true }).select("id,company_name,import_key")
      : { data: [], error: null };
    if (insertError) throw insertError;
    const insertedKeys = new Set((inserted || []).map((row) => row.import_key));
    const duplicateKeys = rows.filter((row) => !insertedKeys.has(row.import_key)).map((row) => row.import_key);
    const { data: existing } = duplicateKeys.length
      ? await access.supabase.from("leads").select("id,company_name,import_key").eq("organization_id", access.organizationId).in("import_key", duplicateKeys)
      : { data: [] };

    await access.supabase.from("prospecting_jobs").update({ status: "completed", generated_quantity: inserted?.length || 0, completed_at: new Date().toISOString() }).eq("id", job.id);

    const refund = Math.max(0, input.quantity - (inserted?.length || 0));
    try {
      const admin = createAdminSupabase();
      if (refund) await admin.from("usage_events").insert({ organization_id: access.organizationId, user_id: access.user.id, metric: "prospecting_credit", quantity: -refund, reference_id: job.id, metadata: { state: "adjusted_to_imported_quantity" } });
      await admin.from("audit_logs").insert({ organization_id: access.organizationId, user_id: access.user.id, action: "lead_finder.completed", entity_type: "prospecting_job", entity_id: job.id, metadata: { service: input.service, found: found.length, imported: inserted?.length || 0 } });
    } catch { /* registro administrativo indisponível não invalida a busca */ }

    const byKey = new Map(rows.map((row) => [row.import_key, row]));
    const summarize = (row: { id: string; company_name: string; import_key: string }) => {
      const lead = byKey.get(row.import_key);
      return { id: row.id, company_name: row.company_name, city: lead?.city || null, state: lead?.state || null, phone: lead?.phone || null, whatsapp: lead?.whatsapp || null, whatsapp_confirmed: lead?.whatsapp_confirmed || false, website: lead?.website || null, marketplace_url: lead?.marketplace_url || null, marketplace_listings: lead?.marketplace_listings ?? null };
    };
    return Response.json({ jobId: job.id, found: found.length, imported: (inserted || []).map(summarize), existing: (existing || []).map(summarize) });
  } catch (error) {
    try {
      if (organizationId && (jobId || reserved)) {
        const admin = createAdminSupabase();
        if (jobId) await admin.from("prospecting_jobs").update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 300) : "Falha na busca", completed_at: new Date().toISOString() }).eq("id", jobId);
        if (reserved) await admin.from("usage_events").insert({ organization_id: organizationId, user_id: userId, metric: "prospecting_credit", quantity: -reserved, reference_id: jobId, metadata: { state: "refunded_after_failure" } });
      }
    } catch { /* preserva o erro original */ }
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    if (error instanceof Error && error.message.startsWith("SERPAPI:")) return Response.json({ error: `A busca externa falhou: ${error.message.slice(9, 200)}` }, { status: 502 });
    return accessErrorResponse(error);
  }
}
