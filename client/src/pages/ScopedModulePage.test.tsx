/** @vitest-environment jsdom */
import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { authState, accessState, fromMock } = vi.hoisted(() => ({
  authState: { value: { user: null as { id: string } | null, loading: false, isAuthenticated: false, error: null as string | null } },
  accessState: { value: { roles: [] as string[], memberships: [] as any[], loading: false, error: null as string | null, isOG: false, isTeamLead: false, isCommitteeLead: false, isIR: false, isMember: false, navItems: [] as any[] } },
  fromMock: vi.fn(),
}));

vi.mock("@/hooks/useSupabaseAuth", () => ({ useSupabaseAuth: () => authState.value }));
vi.mock("@/hooks/useSupabaseAccess", () => ({ useSupabaseAccess: () => accessState.value }));
vi.mock("@/lib/supabase", () => ({ supabase: { from: fromMock } }));
vi.mock("@/services/scopedOperations", () => ({ runScopedOperation: vi.fn() }));
vi.mock("wouter", () => ({ Link: ({ children, href }: { children: React.ReactNode; href?: string }) => <a href={href}>{children}</a>, useLocation: () => ["/workspace/committee"] }));

import ScopedModulePage from "./ScopedModulePage";

function setAuthenticated(allowed: boolean) {
  authState.value = { user: { id: "user-1" }, loading: false, isAuthenticated: true, error: null };
  accessState.value = { roles: allowed ? ["committee_head"] : ["team_member"], memberships: allowed ? [{ id: "membership-1", committee_id: "committee-1", position: "head", committee: { slug: "media" } }] : [{ id: "membership-1", committee_id: "committee-1", position: "member", committee: { slug: "media" } }], loading: false, error: null, isOG: false, isTeamLead: false, isCommitteeLead: allowed, isIR: false, isMember: true, navItems: [] };
}

describe("ScopedModulePage rendered route behavior", () => {
  beforeEach(() => { fromMock.mockReset(); fromMock.mockReturnValue({ select: vi.fn().mockResolvedValue({ count: 0, data: [], error: null }) }); });
  afterEach(() => { cleanup(); authState.value = { user: null, loading: false, isAuthenticated: false, error: null }; accessState.value = { roles: [], memberships: [], loading: false, error: null, isOG: false, isTeamLead: false, isCommitteeLead: false, isIR: false, isMember: false, navItems: [] }; });

  it("renders the unauthenticated boundary", () => {
    render(<ScopedModulePage />);
    expect(screen.getByText("Scope boundary held.")).toBeTruthy();
  });

  it("renders the unauthorized boundary for an authenticated member", () => {
    setAuthenticated(false);
    render(<ScopedModulePage />);
    expect(screen.getByText(/do not authorize the Committee scope module/)).toBeTruthy();
  });

  it("renders a ready module and executes a protected read action", async () => {
    setAuthenticated(true);
    render(<ScopedModulePage />);
    expect(await screen.findByText("Application queue")).toBeTruthy();
    expect(screen.getByText("Refresh scoped data")).toBeTruthy();
  });

  it("renders the explicit source error when a canonical table fails", async () => {
    setAuthenticated(true);
    fromMock.mockReturnValue({ select: vi.fn().mockResolvedValue({ count: null, data: null, error: { message: "relation unavailable" } }) });
    render(<ScopedModulePage />);
    await waitFor(() => expect(screen.getByText(/A scope data source failed/)).toBeTruthy());
    expect(screen.getByText(/relation unavailable/)).toBeTruthy();
  });
});
