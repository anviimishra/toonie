vi.mock("@/lib/server-auth", async (original) => ({
  ...(await original<typeof import("@/lib/server-auth")>()),
  requireUser: vi.fn(),
  requirePair: vi.fn(),
}));
import { beforeEach, expect, it, vi } from "vitest";
import { requirePair, requireUser } from "@/lib/server-auth";
import { GET, PATCH } from "./route";

const PAIR = "11111111-1111-4111-8111-111111111111";
const IMAGE = "data:image/png;base64,Yg==";

/** Records every write so tests can see what reached the database. */
function fakeDb(rows: unknown[] = []) {
  const writes: { table: string; op: string; value: unknown }[] = [];
  const db = {
    writes,
    from(table: string) {
      const q = {
        select: () => q,
        eq: () => q,
        single: async () => ({ data: { saved: true }, error: null }),
        upsert: (value: unknown) => (writes.push({ table, op: "upsert", value }), q),
        update: (value: unknown) => (writes.push({ table, op: "update", value }), q),
        then: (resolve: (r: unknown) => void) => resolve({ data: rows, error: null }),
      };
      return q;
    },
  };
  return db;
}

function as(user: { id: string; is_anonymous: boolean; email?: string }, db = fakeDb()) {
  vi.mocked(requireUser).mockResolvedValueOnce({ user, db } as unknown as Awaited<
    ReturnType<typeof requireUser>
  >);
  return db;
}

const parent = { id: "parent", is_anonymous: false, email: "p@x.com" };
const child = { id: "child", is_anonymous: true };
const pair = { id: PAIR, parent_id: "parent", child_id: "child" } as Awaited<
  ReturnType<typeof requirePair>
>;

function patch(body: unknown) {
  return PATCH(
    new Request("http://localhost/api/family", { method: "PATCH", body: JSON.stringify(body) }),
  );
}

beforeEach(() => vi.mocked(requirePair).mockReset().mockResolvedValue(pair));

it("lets the parent set the child's language", async () => {
  const db = as(parent);
  const response = await patch({ pairId: PAIR, role: "child", language: "es" });
  expect(response.status).toBe(200);
  expect(db.writes).toEqual([
    {
      table: "family_members",
      op: "upsert",
      value: { pair_id: PAIR, role: "child", language: "es" },
    },
  ]);
});

it("mirrors a new child avatar onto the pair for older readers", async () => {
  const db = as(parent);
  await patch({ pairId: PAIR, role: "child", avatarReference: IMAGE });
  expect(db.writes.map((w) => `${w.op} ${w.table}`)).toEqual([
    "upsert family_members",
    "update parent_child_pairs",
  ]);
});

it("rejects unknown languages and web-link avatars", async () => {
  as(parent);
  expect((await patch({ pairId: PAIR, role: "parent", language: "xx" })).status).toBe(400);
  as(parent);
  expect(
    (await patch({ pairId: PAIR, role: "parent", avatarReference: "https://x.test/a.png" })).status,
  ).toBe(400);
});

it("does not let the child's tablet change settings", async () => {
  const db = as(child);
  expect((await patch({ pairId: PAIR, role: "child", language: "fr" })).status).toBe(403);
  expect(db.writes).toEqual([]);
});

it("does not let another parent change someone else's pair", async () => {
  const db = as({ id: "stranger", is_anonymous: false, email: "s@x.com" });
  expect((await patch({ pairId: PAIR, role: "child", language: "fr" })).status).toBe(403);
  expect(db.writes).toEqual([]);
});

it("returns both people's settings to either tablet", async () => {
  as(
    child,
    fakeDb([
      { role: "parent", language: "en" },
      { role: "child", language: "es" },
    ]),
  );
  const response = await GET(new Request(`http://localhost/api/family?pairId=${PAIR}`));
  expect(await response.json()).toEqual({
    parent: { role: "parent", language: "en" },
    child: { role: "child", language: "es" },
  });
});
