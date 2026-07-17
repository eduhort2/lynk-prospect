"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { Organization, Profile, UserRole } from "@/types";

interface OrganizationContextValue {
  organization: Organization | null;
  organizationId: string | null;
  profile: Profile | null;
  role: UserRole | null;
  userId: string | null;
  isLoading: boolean;
  error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createBrowserSupabase(), []);
  const query = useQuery({
    queryKey: ["organization-context"],
    queryFn: async () => {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw authError || new Error("Sessão não encontrada");

      const [{ data: membership, error: memberError }, { data: profile, error: profileError }] = await Promise.all([
        supabase
          .from("organization_members")
          .select("organization_id, role, organizations(id,name,slug,created_at)")
          .eq("user_id", authData.user.id)
          .limit(1)
          .maybeSingle(),
        supabase.from("profiles").select("*").eq("id", authData.user.id).maybeSingle(),
      ]);

      if (memberError) throw memberError;
      if (profileError) throw profileError;
      if (!membership) throw new Error("Seu usuário ainda não pertence a uma organização");

      const rawOrg = membership.organizations as unknown;
      const organization = (Array.isArray(rawOrg) ? rawOrg[0] : rawOrg) as Organization;
      return {
        organization,
        organizationId: membership.organization_id as string,
        profile: profile as Profile,
        role: membership.role as UserRole,
        userId: authData.user.id,
      };
    },
  });

  const value = useMemo<OrganizationContextValue>(
    () => ({
      organization: query.data?.organization ?? null,
      organizationId: query.data?.organizationId ?? null,
      profile: query.data?.profile ?? null,
      role: query.data?.role ?? null,
      userId: query.data?.userId ?? null,
      isLoading: query.isLoading,
      error: query.error instanceof Error ? query.error : null,
    }),
    [query.data, query.error, query.isLoading],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) throw new Error("useOrganization precisa estar dentro de OrganizationProvider");
  return context;
}
