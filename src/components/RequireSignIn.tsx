"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useCurrentUser } from "@/features/auth";

/**
 * Anyone not signed in starts at the front door: the Toonie splash
 * (/welcome) → /start to pick grown-up or kid → grown-ups sign in at /login. Renders nothing until we know
 * who you are, so a signed-out visitor never sees a flash of the app.
 */
export function RequireSignIn({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && !user) router.replace("/welcome");
  }, [loading, user, router]);

  if (loading || !user) return null;
  return <>{children}</>;
}
