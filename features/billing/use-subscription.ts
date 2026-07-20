"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useOrganization } from "@/features/auth/organization-provider";
import { getCommercialPlan } from "@/lib/billing/plans";
import { createBrowserSupabase } from "@/lib/supabase/client";

export function useSubscription() {
  const { organizationId } = useOrganization();
  const supabase = useMemo(() => createBrowserSupabase(), []);

  return useQuery({
    queryKey: ["subscription", organizationId],
    enabled: Boolean(organizationId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plan:plans(*)")
        .eq("organization_id", organizationId!)
        .maybeSingle();

      if (error && error.code !== "PGRST205") throw error;
      const nestedPlan = data?.plan as unknown;
      const plan = Array.isArray(nestedPlan) ? nestedPlan[0] : nestedPlan;
      const fallback = getCommercialPlan("free");
      return {
        subscription: data,
        plan: plan || {
          code: fallback.code,
          name: fallback.name,
          price_monthly: fallback.price,
          max_members: fallback.members,
          max_stored_leads: fallback.storedLeads,
          monthly_prospecting_credits: fallback.prospectingCredits,
        },
      };
    },
  });
}
