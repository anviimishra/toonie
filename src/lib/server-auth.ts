import { createClient, type User } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function apiError(error: unknown): Response {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("[api]", describeError(error));
  return Response.json(
    { error: "Couldn't complete that request. Please try again." },
    { status: 500 },
  );
}
/**
 * Something readable for the server log. Supabase returns plain objects
 * ({ message, code, details }), not Error instances, so check for both.
 */
function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const { message, code, details, hint } = error as Record<string, unknown>;
    const parts = [code && `[${code}]`, message, details, hint].filter(
      (part) => typeof part === "string" && part,
    );
    if (parts.length) return parts.join(" ");
  }
  return "Request failed";
}

export async function requireUser(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) throw new ApiError(401, "Please sign in again.");
  const db = supabaseServer();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) throw new ApiError(401, "Your session expired. Please sign in again.");
  const env = publicEnv();
  const client = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
  return { user: data.user, db, client };
}
export function requireParent(user: User) {
  if (user.is_anonymous || !user.email)
    throw new ApiError(403, "Sign in with a parent email and password.");
}
export async function requirePair(db: ReturnType<typeof supabaseServer>, id: string, user: User) {
  const { data, error } = await db
    .from("parent_child_pairs")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.parent_id !== user.id && data.child_id !== user.id))
    throw new ApiError(404, "Pairing not found.");
  return data;
}
