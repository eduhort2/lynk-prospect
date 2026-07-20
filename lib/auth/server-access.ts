import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";

export async function requireOrganizationAccess(allowedRoles?: string[]) {
  const supabase = await createServerSupabase();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) throw new Error("UNAUTHORIZED");

  const { data: membership, error } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", authData.user.id)
    .limit(1)
    .maybeSingle();

  if (error || !membership) throw new Error("FORBIDDEN");
  if (allowedRoles && !allowedRoles.includes(membership.role)) throw new Error("FORBIDDEN");

  return {
    supabase,
    user: authData.user,
    organizationId: membership.organization_id as string,
    role: membership.role as string,
  };
}

export function accessErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
  if (message === "UNAUTHORIZED") return Response.json({ error: "Sessão inválida" }, { status: 401 });
  if (message === "FORBIDDEN") return Response.json({ error: "Acesso não autorizado" }, { status: 403 });
  return Response.json({ error: "Não foi possível concluir a solicitação" }, { status: 500 });
}
