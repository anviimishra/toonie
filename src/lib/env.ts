import { z } from "zod";

/**
 * Environment variables, checked once so a missing key fails loudly
 * instead of causing a confusing error deep inside a request.
 *
 * Public values (NEXT_PUBLIC_*) are safe in the browser.
 * Server values must only be read from server code.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SECRET_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  IMAGE_PROVIDER: z.enum(["openai", "hf"]).default("openai"),
  HF_API_TOKEN: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Missing or invalid public env vars:\n${format(result.error)}`);
  }
  return result.data;
}

export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Missing or invalid server env vars:\n${format(result.error)}`);
  }
  return result.data;
}

// Next.js only inlines NEXT_PUBLIC_* when accessed by full name, so list them explicitly.
export const publicEnv = (): PublicEnv =>
  parsePublicEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });

export const serverEnv = (): ServerEnv => parseServerEnv(process.env);
