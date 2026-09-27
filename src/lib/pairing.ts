import { createHmac } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { ApiError } from "./server-auth";
import { supabaseServer } from "./supabase/server";
export function secretHash(value: string): string {
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY");
  return createHmac("sha256", key).update(value).digest("hex");
}
export async function limitRequest(request: Request, user: User, action: string, max: number) {
  const db = supabaseServer();
  // Vercel supplies/overwrites this address. Local dev falls back to one shared key.
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    : "local";
  for (const key of [`user:${user.id}`, `ip:${ip ?? "unknown"}`]) {
    const { data, error } = await db.rpc("consume_request_limit", {
      p_key: secretHash(`${action}:${key}`),
      p_max: max,
    });
    if (error) throw error;
    if (!data) throw new ApiError(429, "Too many attempts. Please wait ten minutes and try again.");
  }
}
