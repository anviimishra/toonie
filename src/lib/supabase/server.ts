import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Server-side Supabase client.
 *
 * Uses the secret key, so it bypasses RLS and can read and write every table.
 * Import it only from server code: route handlers, server components, and
 * features/*. Never from a component that ships to the browser.
 */

export type ServerClient = SupabaseClient<Database>;

let cached: ServerClient | undefined;

export function supabaseServer(): ServerClient {
  // A bundler pulling this into client code would ship the secret key to every
  // visitor. Fail loudly at the first call instead.
  if (typeof window !== "undefined") {
    throw new Error(
      "supabaseServer() was called in the browser. Use supabaseBrowser() from @/lib/supabase/client instead.",
    );
  }

  if (!cached) {
    const env = serverEnv();
    cached = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
      // No user sessions here: this client is one long-lived service identity.
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return cached;
}

/** Drops the memoized client. Tests only. */
export function resetSupabaseServer(): void {
  cached = undefined;
}
