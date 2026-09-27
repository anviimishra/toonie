vi.mock("@/lib/server-auth", async (original) => ({
  ...(await original<typeof import("@/lib/server-auth")>()),
  requireUser: vi.fn(),
  requirePair: vi.fn(),
}));
vi.mock("@/lib/voiceover", () => ({ getVoiceover: vi.fn() }));
import { beforeEach, expect, it, vi } from "vitest";
import { NotConfiguredError } from "@/lib/ai/translate";
import { requirePair, requireUser } from "@/lib/server-auth";
import { getVoiceover } from "@/lib/voiceover";
import { POST } from "./route";

const ID = "22222222-2222-4222-8222-222222222222";
const pair = { id: "pair", parent_id: "parent", child_id: "child" };

function signedInAs(id: string, message: unknown) {
  const query = {
    select: () => query,
    eq: () => query,
    maybeSingle: async () => ({ data: message, error: null }),
  };
  vi.mocked(requireUser).mockResolvedValueOnce({
    user: { id },
    db: { from: () => query },
  } as unknown as Awaited<ReturnType<typeof requireUser>>);
}

const post = () =>
  POST(
    new Request("http://localhost/api/messages/voiceover", {
      method: "POST",
      body: JSON.stringify({ id: ID }),
    }),
  );

beforeEach(() => {
  vi.mocked(getVoiceover).mockReset();
  vi.mocked(requirePair).mockResolvedValue(pair as Awaited<ReturnType<typeof requirePair>>);
});

it("reads a parent's story to the child", async () => {
  signedInAs("child", { id: ID, pair_id: "pair", sender_role: "parent" });
  vi.mocked(getVoiceover).mockResolvedValueOnce({
    language: "es",
    text: "Hola",
    audioUrl: "https://signed",
    note: null,
  });
  const response = await post();
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ language: "es", text: "Hola" });
});

it("won't read a story to someone it wasn't sent to", async () => {
  signedInAs("parent", { id: ID, pair_id: "pair", sender_role: "parent" });
  expect((await post()).status).toBe(403);
  expect(getVoiceover).not.toHaveBeenCalled();
});

it("says which key is missing when read-aloud isn't set up", async () => {
  signedInAs("child", { id: ID, pair_id: "pair", sender_role: "parent" });
  vi.mocked(getVoiceover).mockRejectedValueOnce(
    new NotConfiguredError("GEMINI_API_KEY is not set."),
  );
  const response = await post();
  expect(response.status).toBe(503);
  expect((await response.json()).error).toMatch(/GEMINI_API_KEY/);
});

it("404s for an unknown story", async () => {
  signedInAs("child", null);
  expect((await post()).status).toBe(404);
});
