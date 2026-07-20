import { z } from "zod";
import { businessToLead } from "@/features/prospecting/lead-factory";
import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";
import { searchPublicBusinesses } from "@/lib/integrations/google-places";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { prospectingRequestSchema } from "@/lib/validations/prospecting";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  let jobId: string | null = null;
  let reserved = 0;
  let organizationId: string | null = null;
  let userId: string | null = null;
  try {
    const access = await requireOrganizationAccess();
    organizationId = access.organizationId;
    userId = access.user.id;
    const input = prospectingRequestSchema.parse(await request.json());

    const { error: rateError } = await access.supabase.rpc("check_api_rate_limit", {
      target_organization_id: access.organizationId,
      requested_action: "generate_prospecting",
    });
    if (rateError) return Response.json({ error: "Muitas pesquisas em pouco tempo. Aguarde um minuto e tente novamente." }, { status: 429 });

    const { error: quotaError } = await access.supabase.rpc("reserve_prospecting_credits", {
      target_organization_id: access.organizationId,
      requested: input.quantity,
    });
    if (quotaError) {
      const message = quotaError.message.includes("PLAN_REQUIRED") ? "Seu plano não inclui geração de prospecção." : quotaError.message.includes("QUOTA_EXCEEDED") ? "O limite mensal do plano foi atingido." : "Não foi possível reservar os créditos.";
      return Response.json({ error: message }, { status: 402 });
    }
    reserved = input.quantity;

    const { data: job, error: jobError } = await access.supabase.from("prospecting_jobs").insert({
      organization_id: access.organizationId,
      user_id: access.user.id,
      region: input.region,
      niche: input.niche,
      requested_quantity: input.quantity,
      status: "running",
      filters: { website: input.websiteFilter },
    }).select("id").single();
    if (jobError) throw jobError;
    jobId = job.id;

    const businesses = await searchPublicBusinesses(input);
    const leads = businesses.map((business) => ({
      ...businessToLead(business, input.niche, input.region),
      organization_id: access.organizationId,
      responsible_user: access.user.id,
      prospecting_job_id: job.id,
    }));

    const { data: inserted, error: leadsError } = leads.length
      ? await access.supabase.from("leads").upsert(leads, { onConflict: "organization_id,import_key", ignoreDuplicates: true }).select("*")
      : { data: [], error: null };
    if (leadsError) throw leadsError;

    await access.supabase.from("prospecting_jobs").update({
      status: "completed",
      generated_quantity: inserted?.length || 0,
      completed_at: new Date().toISOString(),
    }).eq("id", job.id);

    const importedCount = inserted?.length || 0;
    const refund = Math.max(0, input.quantity - importedCount);
    const admin = createAdminSupabase();
    if (refund) await admin.from("usage_events").insert({ organization_id: access.organizationId, user_id: access.user.id, metric: "prospecting_credit", quantity: -refund, reference_id: job.id, metadata: { state: "adjusted_to_imported_quantity" } });
    await admin.from("audit_logs").insert({ organization_id: access.organizationId, user_id: access.user.id, action: "prospecting.completed", entity_type: "prospecting_job", entity_id: job.id, metadata: { requested: input.quantity, found: businesses.length, imported: importedCount } });

    return Response.json({ jobId: job.id, found: businesses.length, imported: importedCount, leads: inserted || [] });
  } catch (error) {
    try {
      const admin = organizationId ? createAdminSupabase() : null;
      if (admin && jobId) await admin.from("prospecting_jobs").update({ status: "failed", error_message: error instanceof Error ? error.message.slice(0, 300) : "Falha na geração", completed_at: new Date().toISOString() }).eq("id", jobId);
      if (admin && reserved && organizationId) await admin.from("usage_events").insert({ organization_id: organizationId, user_id: userId, metric: "prospecting_credit", quantity: -reserved, reference_id: jobId, metadata: { state: "refunded_after_failure" } });
    } catch {
      // O erro original é preservado mesmo se o registro administrativo estiver indisponível.
    }
    if (error instanceof Error && error.message === "GOOGLE_PLACES_NOT_CONFIGURED") return Response.json({ error: "A pesquisa automática ainda não foi ativada pela LYNK." }, { status: 503 });
    if (error instanceof z.ZodError) return Response.json({ error: error.issues[0]?.message || "Dados inválidos" }, { status: 400 });
    return accessErrorResponse(error);
  }
}
