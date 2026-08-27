import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminClient(): SupabaseClient {
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server credentials are not configured.");
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type NotificationRunResult = { processed: number; sent: number; failed: number; deferred: number };

/**
 * Processes only database-created committee shift notifications.
 * The provider token is read server-side and is never returned to callers.
 * A notification is marked sent only after the provider confirms success.
 */
export async function processQueuedShiftNotifications(limit = 25): Promise<NotificationRunResult> {
  const client = getAdminClient();
  const result: NotificationRunResult = { processed: 0, sent: 0, failed: 0, deferred: 0 };
  const providerUrl = process.env.WHATSAPP_API_URL;
  const providerToken = process.env.WHATSAPP_API_TOKEN;

  const { data: notifications, error } = await client
    .from("notifications")
    .select("id,message,recipient_user_id,profiles!notifications_recipient_user_id_fkey(phone)")
    .eq("type", "committee_shift")
    .eq("status", "queued")
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  for (const notification of notifications ?? []) {
    result.processed += 1;
    if (!providerUrl || !providerToken) {
      result.deferred += 1;
      continue;
    }

    const profile = Array.isArray(notification.profiles) ? notification.profiles[0] : notification.profiles;
    const phone = profile?.phone;
    if (!phone) {
      await client.from("notifications").update({ status: "failed", error: "Recipient has no phone number." }).eq("id", notification.id).eq("status", "queued");
      result.failed += 1;
      continue;
    }

    try {
      const response = await fetch(providerUrl, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${providerToken}` },
        body: JSON.stringify({ to: phone, message: notification.message }),
      });
      const providerBody = await response.json().catch(() => null) as { id?: string; messageId?: string } | null;
      if (!response.ok) throw new Error(`WhatsApp provider returned ${response.status}`);
      const { error: updateError } = await client.from("notifications").update({ status: "sent", provider_id: providerBody?.id ?? providerBody?.messageId ?? null, sent_at: new Date().toISOString(), error: null }).eq("id", notification.id).eq("status", "queued");
      if (updateError) throw updateError;
      result.sent += 1;
    } catch (reason: unknown) {
      await client.from("notifications").update({ status: "failed", error: reason instanceof Error ? reason.message : "Provider request failed." }).eq("id", notification.id).eq("status", "queued");
      result.failed += 1;
    }
  }

  return result;
}
