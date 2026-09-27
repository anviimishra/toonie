vi.mock("@/lib/server-auth", async (original) => ({
  ...(await original<typeof import("@/lib/server-auth")>()),
  requireUser: vi.fn(),
}));
vi.mock("@/lib/voiceover", () => ({ parentPairIds: vi.fn(async () => ["pair"]) }));
vi.mock("@/lib/ai/elevenlabs", () => ({ deleteVoice: vi.fn(async () => {}) }));
import { beforeEach, expect, it, vi } from "vitest";
import { deleteVoice } from "@/lib/ai/elevenlabs";
import { requireUser } from "@/lib/server-auth";
import { POST } from "./route";

/** A db that answers selects from `data[table]` and records writes. */
function fakeDb(data: Record<string, unknown[]>) {
  const writes: string[] = [];
  const removed: string[][] = [];
  return {
    writes,
    removed,
    storage: { from: () => ({ remove: async (paths: string[]) => (removed.push(paths), {}) }) },
    from(table: string) {
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        is: () => q,
        update: (v: unknown) => (writes.push(`update ${table} ${JSON.stringify(v)}`), q),
        delete: () => (writes.push(`delete ${table}`), q),
        then: (resolve: (r: unknown) => void) => resolve({ data: data[table] ?? [], error: null }),
      };
      return q;
    },
  };
}

function as(user: object, db: ReturnType<typeof fakeDb>) {
  vi.mocked(requireUser).mockResolvedValueOnce({ user, db } as unknown as Awaited<
    ReturnType<typeof requireUser>
  >);
  return db;
}

const parent = { id: "parent", is_anonymous: false, email: "p@x.com" };
const post = (consent: boolean) =>
  POST(
    new Request("http://localhost/api/family/voice", {
      method: "POST",
      body: JSON.stringify({ consent }),
    }),
  );

beforeEach(() => vi.mocked(deleteVoice).mockClear());

it("records the parent's consent", async () => {
  const db = as(parent, fakeDb({}));
  expect((await post(true)).status).toBe(200);
  expect(db.writes[0]).toMatch(/^update family_members \{"voice_consent_at":/);
});

it("turning it off deletes the voice and every read-aloud made with it", async () => {
  const db = as(
    parent,
    fakeDb({
      family_members: [{ voice_id: "v1" }],
      comic_messages: [{ id: "m1" }],
      message_voiceovers: [{ audio_path: "pair/m1/voiceover-es.mp3" }],
    }),
  );
  expect((await post(false)).status).toBe(200);
  expect(deleteVoice).toHaveBeenCalledWith("v1");
  expect(db.writes).toContain('update family_members {"voice_consent_at":null,"voice_id":null}');
  expect(db.writes).toContain("delete message_voiceovers");
  expect(db.removed).toEqual([["pair/m1/voiceover-es.mp3"]]);
});

it("is only for parents", async () => {
  const db = as({ id: "child", is_anonymous: true }, fakeDb({}));
  expect((await post(true)).status).toBe(403);
  expect(db.writes).toEqual([]);
});
