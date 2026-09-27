import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Browser Supabase client.
 *
 * Uses the publishable key, so RLS applies: it can read `deliveries` and
 * nothing else (see the policies in supabase/migrations). Its job is the
 * Realtime subscription that tells a robot a comic is waiting -- story content
 * is fetched through /api/* with the server client.
 */

export type BrowserClient = SupabaseClient<Database>;

let cached: BrowserClient | undefined;

export function supabaseBrowser(): BrowserClient {
  if (!cached) {
    const env = publicEnv();
    cached = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    );
  }

  return cached;
}

/** Drops the memoized client. Tests only. */
export function resetSupabaseBrowser(): void {
  cached = undefined;
}

/** Realtime channel a robot subscribes to for its capsule's deliveries. */
export function deliveriesChannel(capsuleId: string): string {
  return `deliveries:${capsuleId}`;
}

// Separate child device session allows parent and child tabs on one demo browser.
let childCached: BrowserClient | undefined;
export function supabaseChild(): BrowserClient {
  if (!childCached) {
    const env = publicEnv();
    childCached = createClient<Database>(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      { auth: { storageKey: "toonie.child.auth", detectSessionInUrl: false } },
    );
  }
  return childCached;
}
