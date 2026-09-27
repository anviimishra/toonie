"use client";

import { useEffect, useState } from "react";
import { supabaseAuth } from "./supabase";
import type { AuthAdapter, AuthUser } from "./types";

export type { AuthAdapter, AuthUser, Credentials } from "./types";

/** The parent account uses Supabase email/password authentication. */
export const auth: AuthAdapter = supabaseAuth;

/** The signed-in user, or null. `loading` is true until the first answer. */
export function useCurrentUser(): { user: AuthUser | null; loading: boolean } {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    auth
      .currentUser()
      .then((found) => {
        if (!active) return;
        setUser(found);
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setLoading(false);
        }
      });
    const unsubscribe = auth.onChange(setUser);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return { user, loading };
}
