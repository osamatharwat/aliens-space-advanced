import { useEffect, useState } from "react";
import {
  getSession,
  onAuthStateChange,
  requestPasswordReset,
  signInWithPassword,
  signOut,
  signUpWithPassword,
  type AuthSession,
  type AuthUser,
} from "@/lib/supabase";

export function useSupabaseAuth() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    getSession()
      .then((current) => {
        if (mounted) setSession(current);
      })
      .catch((reason: unknown) => {
        if (mounted) setError(reason instanceof Error ? reason.message : "Unable to restore the Supabase session.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setError(null);
      }
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const run = async <T,>(action: () => Promise<T>) => {
    setError(null);
    try {
      return await action();
    } catch (reason: unknown) {
      const message = reason instanceof Error ? reason.message : "Supabase authentication failed.";
      setError(message);
      throw reason;
    }
  };

  return {
    session,
    user: session?.user as AuthUser | undefined,
    loading,
    error,
    isAuthenticated: Boolean(session?.user),
    signIn: (email: string, password: string) => run(() => signInWithPassword(email, password)),
    signUp: (email: string, password: string, name: string) => run(() => signUpWithPassword(email, password, name)),
    resetPassword: (email: string) => run(() => requestPasswordReset(email)),
    signOut: () => run(signOut),
  };
}
