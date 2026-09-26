"use client";

import { useEffect, useState } from "react";
import { createStubAuth } from "./stub";
import type { AuthAdapter, AuthUser } from "./types";

export type { AuthAdapter, AuthUser, Credentials } from "./types";

/**
 * The adapter the app uses. Swap this line for the Supabase adapter when
 * accounts are real; nothing else changes.
 */
export const auth: AuthAdapter = createStubAuth();

/** The signed-in user, or null. `loading` is true until the first answer. */
export function useCurrentUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth.currentUser().then((found) => {
      if (!active) return;
      setUser(found);
      setLoading(false);
    });
    const unsubscribe = auth.onChange(setUser);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}
