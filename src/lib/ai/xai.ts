import { aiEnv } from "@/lib/env";

/**
 * A thin client for the xAI REST API. Server only: it reads the secret key.
 *
 * Deliberately plain `fetch` rather than an SDK — we use three endpoints, and
 * each needs a timeout and a readable error more than it needs a library.
 */

const BASE_URL = "https://api.x.ai/v1";

export class XaiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
  ) {
    super(message);
    this.name = "XaiError";
  }

  /** Worth trying again: rate limits and the provider's own hiccups. */
  get retryable(): boolean {
    return this.status === 429 || this.status >= 500 || this.status === 0;
  }
}

type RequestOptions = {
  /** JSON body, or FormData for uploads. */
  body: unknown;
  timeoutMs: number;
};

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => "");
  try {
    const parsed = JSON.parse(text) as { error?: string | { message?: string } };
    const error = parsed.error;
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
  } catch {
    // Not JSON; fall through to the raw text.
  }
  return text.slice(0, 300) || response.statusText;
}

export async function xaiPost<T>(
  endpoint: string,
  { body, timeoutMs }: RequestOptions,
): Promise<T> {
  const isForm = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${aiEnv().XAI_API_KEY}`,
        ...(isForm ? {} : { "Content-Type": "application/json" }),
      },
      body: isForm ? body : JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    throw new XaiError(
      timedOut ? `Timed out after ${timeoutMs / 1000}s` : "Could not reach xAI",
      0,
      endpoint,
    );
  }

  if (!response.ok) {
    throw new XaiError(await readError(response), response.status, endpoint);
  }
  return (await response.json()) as T;
}

/** Retry a call once or twice when the failure is the transient kind. */
export async function withRetry<T>(run: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (!(error instanceof XaiError) || !error.retryable || attempt === attempts) break;
      await new Promise((resolve) => setTimeout(resolve, 800 * 2 ** attempt));
    }
  }
  throw lastError;
}
