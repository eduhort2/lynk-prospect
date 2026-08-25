import { accessErrorResponse, requireOrganizationAccess } from "@/lib/auth/server-access";

export async function DELETE() {
  try {
    const access = await requireOrganizationAccess(["admin", "manager"]);
    const { data, error } = await access.supabase.rpc("clear_organization_leads", { target_organization_id: access.organizationId });
    if (error) throw error;
    return Response.json({ deleted: Number(data || 0) });
  } catch (error) {
    return accessErrorResponse(error);
  }
}
