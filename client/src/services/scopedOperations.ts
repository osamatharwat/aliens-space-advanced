import { supabase } from "@/lib/supabase";
import { assertScopeForOperation, type ScopeKey, type ScopeMembership } from "@shared/access";

type ElevatedScope = Exclude<ScopeKey, "identity" | "member">;
export type ScopedOperationContext = { userId: string; roles: string[]; memberships: ScopeMembership[] };

export function assertScopedOperation(scope: ElevatedScope, context: ScopedOperationContext) {
  assertScopeForOperation(scope, context.roles, context.memberships);
}

export async function inspectCommitteeQueue(context: ScopedOperationContext) {
  assertScopedOperation("committee", context);
  const committeeIds = context.memberships.filter((membership) => membership.position !== "member").map((membership) => membership.committee_id);
  let query = supabase.from("applications").select("id,status,committee_id,submitted_at").limit(50);
  if (committeeIds.length > 0) query = query.in("committee_id", committeeIds);
  const result = await query;
  if (result.error) throw result.error;
  return { label: "Committee queue inspected", rows: result.data ?? [] };
}

export async function inspectIrCapacity(context: ScopedOperationContext) {
  assertScopedOperation("ir", context);
  const result = await supabase.from("ir_evaluator_eligibility").select("user_id,is_eligible,max_capacity,updated_at").limit(50);
  if (result.error) throw result.error;
  return { label: "IR capacity inspected", rows: result.data ?? [] };
}

export async function inspectLeadershipLedger(context: ScopedOperationContext) {
  assertScopedOperation("leadership", context);
  const [applications, events, certificates] = await Promise.all([
    supabase.from("applications").select("id,status,submitted_at").limit(50),
    supabase.from("events").select("id,title,is_published,starts_at").limit(50),
    supabase.from("certificates").select("id,issued_at,verification_code").limit(50),
  ]);
  const failure = applications.error ?? events.error ?? certificates.error;
  if (failure) throw failure;
  return { label: "Leadership ledger inspected", rows: [...(applications.data ?? []), ...(events.data ?? []), ...(certificates.data ?? [])] };
}

export async function inspectOgAudit(context: ScopedOperationContext) {
  assertScopedOperation("og", context);
  const result = await supabase.from("audit_logs").select("id,action,entity_type,created_at").order("created_at", { ascending: false }).limit(50);
  if (result.error) throw result.error;
  return { label: "OG audit trail inspected", rows: result.data ?? [] };
}

export async function runScopedOperation(scope: ElevatedScope, context: ScopedOperationContext) {
  if (scope === "committee") return inspectCommitteeQueue(context);
  if (scope === "ir") return inspectIrCapacity(context);
  if (scope === "leadership") return inspectLeadershipLedger(context);
  return inspectOgAudit(context);
}
