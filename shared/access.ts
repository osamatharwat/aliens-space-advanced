export type ScopeMembership = { committee_id: string; position: string; committee?: { slug?: string | null } | null };
export type ScopeKey = "identity" | "member" | "committee" | "ir" | "leadership" | "og";
export type ScopeNavItem = { href: string; label: string; scope: ScopeKey };
export type ScopeDataSource = "applications" | "committee_tasks" | "events" | "committee_resources" | "ir_assignments" | "evaluations" | "questions" | "ir_evaluator_eligibility" | "certificates" | "site_content" | "user_roles" | "audit_logs" | "gallery_media";

export function canAccessScope(roles: string[], memberships: ScopeMembership[], scope: "committee" | "ir" | "leadership" | "og"): boolean {
  const isOG = roles.includes("og");
  const isTeamLead = roles.some((role) => role === "team_head" || role === "team_sub_head");
  const isCommitteeLead = roles.some((role) => role === "committee_head" || role === "committee_sub_head") || memberships.some((membership) => membership.position !== "member");
  const isIR = roles.some((role) => role === "ir_head" || role === "ir_sub_head" || role === "ir_evaluator") || memberships.some((membership) => membership.committee?.slug?.toLowerCase() === "ir");
  if (scope === "og") return isOG;
  if (scope === "leadership") return isOG || isTeamLead;
  if (scope === "committee") return isOG || isTeamLead || isCommitteeLead;
  return isOG || isTeamLead || isIR;
}

export function assertScopeForOperation(scope: Exclude<ScopeKey, "identity" | "member">, roles: string[], memberships: ScopeMembership[]) {
  if (!canAccessScope(roles, memberships, scope)) throw new Error(`Not authorized for ${scope} operations.`);
}

export type ScopedPageState = "loading" | "unauthenticated" | "unauthorized" | "ready" | "source-error";

export function getScopedPageState(input: { authLoading: boolean; accessLoading: boolean; authenticated: boolean; allowed: boolean; sourceError?: string | null }): ScopedPageState {
  if (input.authLoading || input.accessLoading) return "loading";
  if (!input.authenticated) return "unauthenticated";
  if (!input.allowed) return "unauthorized";
  return input.sourceError ? "source-error" : "ready";
}

export function getScopeDataSources(scope: Exclude<ScopeKey, "identity" | "member">): ScopeDataSource[] {
  const sources: Record<Exclude<ScopeKey, "identity" | "member">, ScopeDataSource[]> = {
    committee: ["applications", "committee_tasks", "events", "committee_resources"],
    ir: ["ir_assignments", "evaluations", "questions", "ir_evaluator_eligibility"],
    leadership: ["applications", "events", "certificates", "site_content"],
    og: ["site_content", "user_roles", "audit_logs", "gallery_media"],
  };
  return sources[scope];
}

export function getScopeNavItems(roles: string[], memberships: ScopeMembership[]): ScopeNavItem[] {
  const isOG = roles.includes("og");
  const isTeamLead = roles.some((role) => role === "team_head" || role === "team_sub_head");
  const isCommitteeLead = roles.some((role) => role === "committee_head" || role === "committee_sub_head") || memberships.some((membership) => membership.position !== "member");
  const isIR = roles.some((role) => role === "ir_head" || role === "ir_sub_head" || role === "ir_evaluator") || memberships.some((membership) => membership.committee?.slug?.toLowerCase() === "ir");
  const isMember = memberships.length > 0 || roles.includes("team_member");
  const items: ScopeNavItem[] = [{ href: "/profile", label: "Profile", scope: "identity" }];
  if (isMember || isCommitteeLead || isIR || isTeamLead || isOG) items.push({ href: "/workspace", label: "Workspace", scope: "member" });
  if (canAccessScope(roles, memberships, "committee")) items.push({ href: "/workspace/committee", label: "Committee scope", scope: "committee" });
  if (canAccessScope(roles, memberships, "ir")) items.push({ href: "/workspace/ir", label: "IR operations", scope: "ir" });
  if (canAccessScope(roles, memberships, "leadership")) items.push({ href: "/workspace/leadership", label: "Leadership", scope: "leadership" });
  if (canAccessScope(roles, memberships, "og")) items.push({ href: "/workspace/og", label: "OG governance", scope: "og" });
  return items;
}
