import { describe, expect, it } from "vitest";

describe("Supabase configuration", () => {
  it("requires the managed public connection values", () => {
    expect(process.env.VITE_SUPABASE_URL, "VITE_SUPABASE_URL must be configured").toBeTruthy();
    expect(process.env.VITE_SUPABASE_ANON_KEY, "VITE_SUPABASE_ANON_KEY must be configured").toBeTruthy();
  });

  it.skipIf(process.env.RUN_SUPABASE_INTEGRATION !== "1")("responds to a lightweight REST metadata request with the configured public key", async () => {
    const url = process.env.VITE_SUPABASE_URL!;
    const key = process.env.VITE_SUPABASE_ANON_KEY!;
    const response = await fetch(`${url}/rest/v1/`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    expect(response.status).toBeLessThan(500);
  }, 15_000);
});
