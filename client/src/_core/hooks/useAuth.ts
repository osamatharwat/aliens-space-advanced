import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

/** Compatibility wrapper for older layout components while Supabase remains the only auth source. */
export function useAuth() {
  const auth = useSupabaseAuth();
  const user = auth.user
    ? {
        ...auth.user,
        name: auth.user.user_metadata?.full_name ?? auth.user.email ?? null,
      }
    : null;
  return {
    user,
    loading: auth.loading,
    error: auth.error ? new Error(auth.error) : null,
    isAuthenticated: auth.isAuthenticated,
    logout: auth.signOut,
    refresh: async () => undefined,
  };
}
