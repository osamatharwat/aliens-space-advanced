import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowUpRight, BarChart3, ClipboardCheck, Database, FileBadge2, FolderLock, Gauge, KeyRound, Loader2, Orbit, RefreshCw, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSupabaseAccess } from "@/hooks/useSupabaseAccess";
import { canAccessScope, getScopedPageState, getScopeDataSources, type ScopeDataSource, type ScopeKey } from "@shared/access";
import { supabase } from "@/lib/supabase";
import { runScopedOperation } from "@/services/scopedOperations";

type ModuleDefinition = { key: ScopeDataSource; label: string; detail: string; icon: typeof Database };
const definitions: Record<Exclude<ScopeKey, "identity" | "member">, { title: string; eyebrow: string; detail: string; modules: ModuleDefinition[] }> = {
  committee: { title: "Your committee, in focus.", eyebrow: "Committee scope", detail: "A bounded workspace for applications, people, tasks, events, and resources belonging to the committees that returned your active membership.", modules: [{ key: "applications", label: "Application queue", detail: "Review only applications assigned to your committee scope.", icon: ClipboardCheck }, { key: "committee_tasks", label: "Tasks", detail: "Track execution without crossing committee boundaries.", icon: KeyRound }, { key: "events", label: "Committee events", detail: "Own events, registration and attendance operations.", icon: Orbit }, { key: "committee_resources", label: "Resources", detail: "Private committee files with signed access.", icon: FolderLock }] },
  ir: { title: "Read the signal, carefully.", eyebrow: "IR operations", detail: "IR work is separated from general membership. Assignments, eligibility, capacity, and evaluations stay inside this scope.", modules: [{ key: "ir_assignments", label: "Assignments", detail: "One active evaluator per member, with capacity checks.", icon: UsersRound }, { key: "evaluations", label: "Evaluation queue", detail: "Only assigned or otherwise authorized evaluation rows.", icon: ClipboardCheck }, { key: "questions", label: "IR question bank", detail: "Versioned prompts with immutable application snapshots.", icon: Database }, { key: "ir_evaluator_eligibility", label: "Capacity", detail: "A live view of eligible evaluators and assigned load.", icon: Gauge }] },
  leadership: { title: "Move the whole system forward.", eyebrow: "Team leadership", detail: "Leadership modules combine broader but still explicit scopes for shifts, analytics, events, attendance, certificates, and permission-scoped exports.", modules: [{ key: "applications", label: "Recruitment operations", detail: "Review, decide, conflict, shift, and audit within permitted scope.", icon: ClipboardCheck }, { key: "events", label: "Events & attendance", detail: "Manage the lifecycle and authorized attendance marking.", icon: Orbit }, { key: "certificates", label: "Certificates", detail: "Issue only after attendance and event eligibility checks.", icon: FileBadge2 }, { key: "site_content", label: "Analytics & exports", detail: "Counts and exports remain filtered to your role scope.", icon: BarChart3 }] },
  og: { title: "Govern the orbit.", eyebrow: "OG governance", detail: "Global controls are separated behind the OG role and remain subject to database RPC authorization and audit history.", modules: [{ key: "site_content", label: "Public content", detail: "Publish committees, events, stories, gallery, partners, and PR.", icon: Orbit }, { key: "user_roles", label: "Permissions", detail: "Manage roles and capability assignments without profile text shortcuts.", icon: ShieldCheck }, { key: "audit_logs", label: "Audit history", detail: "Review important actions without secrets or raw codes.", icon: Database }, { key: "gallery_media", label: "Secure storage", detail: "Maintain database-backed media references and publishing state.", icon: FolderLock }] },
};

function UnauthorizedScope({ scope }: { scope: string }) {
  return <div className="portal-empty"><ShieldCheck className="h-7 w-7 text-emerald-300" /><div><h2>Scope boundary held.</h2><p>Your current Supabase roles and active memberships do not authorize the {scope} module. The database remains the final authority even if a link is opened directly.</p><Link href="/dashboard" className="text-link">Return to command center <ArrowUpRight className="h-4 w-4" /></Link></div></div>;
}

export default function ScopedModulePage() {
  const [location] = useLocation();
  const auth = useSupabaseAuth();
  const access = useSupabaseAccess();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [operationStatus, setOperationStatus] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationBusy, setOperationBusy] = useState(false);
  const scope = useMemo(() => (location.split("/")[2] || "committee") as Exclude<ScopeKey, "identity" | "member">, [location]);
  const definition = definitions[scope] ?? definitions.committee;
  const runAction = useCallback(async () => {
    if (!auth.user || !canAccessScope(access.roles, access.memberships, scope)) { setOperationError(`Not authorized for ${scope} operations.`); return; }
    setOperationBusy(true); setOperationStatus(null); setOperationError(null);
    try {
      const result = await runScopedOperation(scope, { userId: auth.user.id, roles: access.roles, memberships: access.memberships });
      setOperationStatus(`${result.label}: ${result.rows.length} rows returned.`);
    } catch (reason: any) { setOperationError(reason.message ?? "Scoped operation failed."); }
    finally { setOperationBusy(false); }
  }, [access.memberships, access.roles, auth.user, scope]);

  const loadCounts = useCallback(async () => {
    if (!auth.user || !canAccessScope(access.roles, access.memberships, scope)) return;
    setRefreshing(true); setSourceError(null); setActionStatus(null);
    const sources = getScopeDataSources(scope);
    const results = await Promise.all(sources.map(async (source) => {
      const result = await supabase.from(source).select("*", { count: "exact", head: true });
      return { source, count: result.count ?? 0, error: result.error?.message ?? null };
    }));
    const failed = results.filter((result) => result.error);
    if (failed.length > 0) setSourceError(failed.map((result) => `${result.source}: ${result.error}`).join(" · "));
    setCounts(Object.fromEntries(results.map((result) => [result.source, result.count])));
    setActionStatus(failed.length > 0 ? "Scope refresh completed with data-source errors." : "Scope refresh completed from Supabase.");
    setRefreshing(false);
  }, [access.memberships, access.roles, auth.user, scope]);
  useEffect(() => { loadCounts(); }, [loadCounts]);
  const allowed = canAccessScope(access.roles, access.memberships, scope);
  const pageState = getScopedPageState({ authLoading: auth.loading, accessLoading: access.loading, authenticated: auth.isAuthenticated, allowed, sourceError });
  if (pageState === "loading") return <div className="portal-loading"><Loader2 className="animate-spin" />Restoring your authorized scope…</div>;
  if (pageState === "unauthenticated") return <div className="portal-shell"><main className="content-width portal-main"><UnauthorizedScope scope={definition.eyebrow} /></main></div>;
  return <div className="portal-shell"><header className="portal-header"><Link href="/" className="brand-lockup"><span className="brand-mark small"><Orbit className="h-4 w-4" /></span><span className="brand-name">ALIENS <span>SPACE</span></span></Link><span className="portal-user">{definition.eyebrow}</span></header><main className="content-width portal-main"><Link href="/dashboard" className="back-link"><ArrowLeft className="h-4 w-4" />Back to command center</Link><div className="portal-heading"><div className="eyebrow"><span className="eyebrow-dot" />{definition.eyebrow}</div><h1>{definition.title}</h1><p>{definition.detail}</p></div>{!allowed ? <UnauthorizedScope scope={definition.eyebrow} /> : <><div className="scope-proof"><ShieldCheck className="h-5 w-5 text-emerald-300" /><span>Authorized from live Supabase roles and memberships. Every write still requires a server-enforced RPC.</span></div>{access.error && <p className="error-note">Access scope could not be fully restored: {access.error}</p>}{sourceError && <p className="error-note">A scope data source failed: {sourceError}</p>}{actionStatus && <p className="success-note">{actionStatus}</p>}{operationError && <p className="error-note">{operationError}</p>}{operationStatus && <p className="success-note">{operationStatus}</p>}<div className="dashboard-modules">{definition.modules.map((module) => { const Icon = module.icon; return <section className="portal-card module-card" key={module.key}><Icon className="h-5 w-5 text-emerald-300" /><span className="module-scope">{scope} scope · {module.key}</span><h3>{module.label}</h3><p>{module.detail}</p><span className="module-note">{counts[module.key] ?? 0} records in the connected database</span></section>; })}</div><div className="scope-actions"><Button type="button" disabled={operationBusy} onClick={runAction} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">{operationBusy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Run {definition.eyebrow} action</Button><Button type="button" disabled={refreshing} onClick={loadCounts} className="bg-emerald-300 text-slate-950 hover:bg-emerald-200">{refreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}Refresh scoped data</Button><Button asChild variant="outline" className="border-white/15 text-slate-200"><Link href="/workspace">Open shared workspace <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild variant="outline" className="border-white/15 text-slate-200"><Link href="/profile">Review identity <ArrowUpRight className="ml-2 h-4 w-4" /></Link></Button></div></>}</main></div>;
}
