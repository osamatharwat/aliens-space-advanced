import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assertScopeForOperation, canAccessScope, getScopedPageState, getScopeDataSources, getScopeNavItems } from "../shared/access";

const projectRoot = resolve(import.meta.dirname, "..");
const migration = readFileSync(resolve(projectRoot, "supabase/20260827_aliens_space_core.sql"), "utf8");
const appSource = readFileSync(resolve(projectRoot, "client/src/App.tsx"), "utf8");
const scopedModuleSource = readFileSync(resolve(projectRoot, "client/src/pages/ScopedModulePage.tsx"), "utf8");

function readClientFiles() {
  return ["client/src/App.tsx", "client/src/main.tsx", "client/src/contexts/ThemeContext.tsx", "client/src/components/DashboardLayout.tsx", "client/src/_core/hooks/useAuth.ts", "client/src/pages/Home.tsx", "client/src/pages/PortalPages.tsx", "client/src/pages/PublicCatalogPage.tsx", "client/src/services/publicContent.ts"]
    .map((file) => readFileSync(resolve(projectRoot, file), "utf8"))
    .join("\n");
}

describe("Supabase-only runtime guardrails", () => {
  it("does not reintroduce browser operational storage or legacy runtime stores", () => {
    const clientSource = readClientFiles();
    expect(clientSource).not.toMatch(/localStorage|sessionStorage|AppStore|mockData|seedData|INITIAL_/i);
  });

  it("contains the critical database security primitives", () => {
    expect(migration).toContain("create extension if not exists pgcrypto");
    expect(migration).toContain("for update limit 1");
    expect(migration).toContain("auth.uid()");
    expect(migration).toContain("create trigger committee_board_rule");
    expect(migration).toContain("create policy self_profile_update");
    expect(migration).toContain("revoke all on public.committee_access_codes");
    expect(migration).toContain("create or replace function public.verify_certificate_public");
    expect(migration).toContain("create or replace function public.claim_guest_certificate");
    expect(migration).toContain("create or replace function public.shift_application");
    expect(migration).toContain("create or replace function public.assign_ir_member");
    expect(migration).toContain("committee_head");
    expect(migration).toContain("ir_evaluator");
  });

  it("keeps certificate issuance gated by attendance and event eligibility", () => {
    const issueStart = migration.indexOf("create or replace function public.issue_certificate");
    const issueEnd = migration.indexOf("create or replace function public.verify_certificate_public");
    const issueFunction = migration.slice(issueStart, issueEnd);
    expect(issueFunction).toContain("certificate_enabled");
    expect(issueFunction).toContain("status = 'attended'");
    expect(issueFunction).toContain("v_registration");
    expect(issueFunction).toContain("on conflict (registration_id)");
  });
});

describe("scope-aware navigation", () => {
  it("keeps a plain member out of committee, IR, and leadership surfaces", () => {
    const items = getScopeNavItems(["team_member"], [{ committee_id: "committee-1", position: "member", committee: { slug: "media" } }]);
    expect(items.map((item) => item.scope)).toEqual(["identity", "member"]);
    expect(items.some((item) => item.scope === "ir" || item.scope === "leadership" || item.scope === "committee")).toBe(false);
  });

  it("exposes only the scopes represented by the real role/membership inputs", () => {
    const items = getScopeNavItems(["ir_evaluator"], [{ committee_id: "committee-2", position: "head", committee: { slug: "ir" } }]);
    expect(items.map((item) => item.scope)).toEqual(["identity", "member", "committee", "ir"]);
    expect(items.some((item) => item.scope === "leadership")).toBe(false);
  });

  it("gives OG the global leadership surface without trusting a client boolean", () => {
    const items = getScopeNavItems(["og"], []);
    expect(items.map((item) => item.scope)).toEqual(["identity", "member", "committee", "ir", "leadership", "og"]);
  });
});

describe("scope action guards", () => {
  it("rejects direct module access for an unaffiliated user", () => {
    expect(canAccessScope([], [], "committee")).toBe(false);
    expect(canAccessScope(["team_member"], [{ committee_id: "committee-1", position: "member", committee: { slug: "media" } }], "ir")).toBe(false);
    expect(canAccessScope(["team_head"], [], "og")).toBe(false);
  });

  it("allows only the matching elevated scopes", () => {
    expect(canAccessScope(["committee_head"], [{ committee_id: "committee-1", position: "head", committee: { slug: "media" } }], "committee")).toBe(true);
    expect(canAccessScope(["ir_evaluator"], [{ committee_id: "committee-2", position: "member", committee: { slug: "ir" } }], "ir")).toBe(true);
    expect(canAccessScope(["team_sub_head"], [], "leadership")).toBe(true);
    expect(canAccessScope(["team_sub_head"], [], "committee")).toBe(true);
  });
});

describe("scoped operation guards", () => {
  it("throws before any Supabase call when the actor lacks the scope", () => {
    expect(() => assertScopeForOperation("committee", ["team_member"], [{ committee_id: "committee-1", position: "member", committee: { slug: "media" } }])).toThrow("Not authorized for committee operations.");
    expect(() => assertScopeForOperation("og", ["team_head"], [])).toThrow("Not authorized for og operations.");
  });

  it("uses only canonical schema sources for each scope", () => {
    expect(getScopeDataSources("ir")).toEqual(["ir_assignments", "evaluations", "questions", "ir_evaluator_eligibility"]);
    expect(getScopeDataSources("og")).not.toContain("storage");
    expect(getScopeDataSources("leadership")).not.toContain("analytics");
  });
});

describe("scoped route state", () => {
  it("renders the correct denial/error state before exposing a module", () => {
    expect(getScopedPageState({ authLoading: true, accessLoading: false, authenticated: false, allowed: false })).toBe("loading");
    expect(getScopedPageState({ authLoading: false, accessLoading: false, authenticated: false, allowed: false })).toBe("unauthenticated");
    expect(getScopedPageState({ authLoading: false, accessLoading: false, authenticated: true, allowed: false })).toBe("unauthorized");
    expect(getScopedPageState({ authLoading: false, accessLoading: false, authenticated: true, allowed: true, sourceError: "events unavailable" })).toBe("source-error");
    expect(getScopedPageState({ authLoading: false, accessLoading: false, authenticated: true, allowed: true })).toBe("ready");
  });
});

describe("scoped module regressions", () => {
  it("registers distinct routes for all elevated scopes", () => {
    for (const route of ["/workspace/committee", "/workspace/ir", "/workspace/leadership", "/workspace/og"]) expect(appSource).toContain(route);
  });

  it("keeps direct access denied and failed Supabase sources visible", () => {
    expect(scopedModuleSource).toContain("!allowed ? <UnauthorizedScope");
    expect(scopedModuleSource).toContain("sourceError");
    expect(scopedModuleSource).toContain("getScopeDataSources(scope)");
    expect(scopedModuleSource).toContain('select("*", { count: "exact", head: true })');
  });
});
