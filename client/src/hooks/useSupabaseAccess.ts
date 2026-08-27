import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { getScopeNavItems, type ScopeNavItem } from "@shared/access";

export type AccessState = {
  roles: string[];
  memberships: Array<{ id: string; committee_id: string; position: string; committee?: { name: string; slug: string } | null }>;
  loading: boolean;
  error: string | null;
  isOG: boolean;
  isTeamLead: boolean;
  isCommitteeLead: boolean;
  isIR: boolean;
  isMember: boolean;
  navItems: ScopeNavItem[];
};


export function useSupabaseAccess(): AccessState {
  const auth = useSupabaseAuth();
  const [roles, setRoles] = useState<string[]>([]);
  const [memberships, setMemberships] = useState<AccessState["memberships"]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!auth.user) { setRoles([]); setMemberships([]); setLoading(false); return () => { active = false; }; }
    setLoading(true); setError(null);
    Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
      supabase.from("committee_memberships").select("id,committee_id,position,committee:committees(name,slug)").eq("user_id", auth.user.id).eq("status", "active"),
    ]).then(([roleResult, membershipResult]) => {
      if (!active) return;
      if (roleResult.error || membershipResult.error) { setError(roleResult.error?.message ?? membershipResult.error?.message ?? "Unable to restore access scope."); return; }
      setRoles((roleResult.data ?? []).map((row) => row.role));
      setMemberships((membershipResult.data ?? []).map((row: any) => ({ ...row, committee: Array.isArray(row.committee) ? row.committee[0] ?? null : row.committee })));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [auth.user]);

  return useMemo(() => ({
    roles,
    memberships,
    loading: auth.loading || loading,
    error: auth.error ?? error,
    isOG: roles.includes("og"),
    isTeamLead: roles.some((role) => role === "team_head" || role === "team_sub_head"),
    isCommitteeLead: roles.some((role) => role === "committee_head" || role === "committee_sub_head") || memberships.some((membership) => membership.position !== "member"),
    isIR: roles.some((role) => role === "ir_head" || role === "ir_sub_head" || role === "ir_evaluator") || memberships.some((membership) => membership.committee?.slug?.toLowerCase() === "ir"),
    isMember: memberships.length > 0 || roles.includes("team_member"),
    navItems: getScopeNavItems(roles, memberships),
  }), [auth.error, auth.loading, error, loading, memberships, roles]);
}
