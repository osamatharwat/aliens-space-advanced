import { createBrowserClient } from "@supabase/ssr";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase is not configured. Public content will remain empty until the managed secrets are available.");
}

export const supabase = createBrowserClient(
  supabaseUrl ?? "https://invalid.supabase.co",
  supabaseAnonKey ?? "invalid-anon-key",
  {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);

export type AuthUser = User;
export type AuthSession = Session;
export type AuthEvent = AuthChangeEvent;

export function onAuthStateChange(callback: (event: AuthEvent, session: AuthSession | null) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithPassword(email: string, password: string) {
  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error) throw result.error;
  return result.data;
}

export async function signUpWithPassword(email: string, password: string, name: string) {
  const result = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  });
  if (result.error) throw result.error;
  return result.data;
}

export async function requestPasswordReset(email: string) {
  const result = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (result.error) throw result.error;
}

export async function updatePassword(password: string) {
  const result = await supabase.auth.updateUser({ password });
  if (result.error) throw result.error;
  return result.data;
}

export async function signOut() {
  const result = await supabase.auth.signOut();
  if (result.error) throw result.error;
}
