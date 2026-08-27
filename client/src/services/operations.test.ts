import { describe, expect, it, vi } from "vitest";

const { rpcMock } = vi.hoisted(() => ({ rpcMock: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { rpc: rpcMock } }));

import { createEvent } from "./operations";

describe("createEvent domain wrapper", () => {
  it("passes category and WhatsApp settings to the protected RPC", async () => {
    rpcMock.mockResolvedValueOnce({ data: "event-1", error: null });
    await expect(createEvent({ title: "Signal Night", slug: "signal-night", startsAt: "2026-09-01T18:00:00Z", endsAt: "2026-09-01T20:00:00Z", category: "community", whatsappGroupUrl: "https://chat.example/group", certificateEnabled: true, isPublic: true })).resolves.toBe("event-1");
    expect(rpcMock).toHaveBeenCalledWith("create_event", expect.objectContaining({ p_category: "community", p_whatsapp_group_url: "https://chat.example/group", p_certificate_enabled: true, p_is_public: true }));
  });

  it("surfaces protected RPC errors instead of treating creation as successful", async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error("event permission denied") });
    await expect(createEvent({ title: "Blocked", slug: "blocked", startsAt: "2026-09-01T18:00:00Z", endsAt: "2026-09-01T20:00:00Z" })).rejects.toThrow("event permission denied");
  });
});
