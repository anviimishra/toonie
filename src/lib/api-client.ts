import { supabaseBrowser, supabaseChild } from "@/lib/supabase/client";
export async function apiFetch(path: string, init: RequestInit = {}, child = false) {
  const { data, error } = await (child ? supabaseChild() : supabaseBrowser()).auth.getSession();
  if (error || !data.session) throw new Error("Please sign in again.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  return fetch(path, { ...init, headers, cache: "no-store" });
}
export async function apiJson<T>(path: string, init: RequestInit = {}, child = false): Promise<T> {
  const response = await apiFetch(path, init, child);
  const result = await response.json();
  if (!response.ok)
    throw new Error(
      typeof result.error === "string"
        ? result.error
        : (result.error?.message ?? "That request failed."),
    );
  return result as T;
}
export const jsonBody = (value: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(value),
});
