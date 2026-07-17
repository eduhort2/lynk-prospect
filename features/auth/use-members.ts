"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createBrowserSupabase } from "@/lib/supabase/client";
import type { OrganizationMember, Profile } from "@/types";
import { useOrganization } from "./organization-provider";

export function useMembers() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  return useQuery({
    queryKey: ["members", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("organization_id,user_id,role,profiles:user_id(*)")
        .eq("organization_id", organizationId!);
      if (error) throw error;
      return (data || []).map((row) => ({
        ...row,
        profile: (Array.isArray(row.profiles) ? row.profiles[0] : row.profiles) as Profile,
      })) as OrganizationMember[];
    },
  });
}
