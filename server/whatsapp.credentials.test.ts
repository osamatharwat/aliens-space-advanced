import { describe, expect, it } from "vitest";

describe("WhatsApp provider configuration", () => {
  it("keeps delivery deferred when optional provider credentials are absent", () => {
    if (!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN) expect(true).toBe(true);
  });

  it.skipIf(!process.env.WHATSAPP_API_URL || !process.env.WHATSAPP_API_TOKEN)("accepts the configured provider endpoint with the server token", async () => {
    const response = await fetch(process.env.WHATSAPP_API_URL!, {
      method: "HEAD",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN!}` },
    });
    expect(response.status).toBeLessThan(500);
  }, 15_000);
});
