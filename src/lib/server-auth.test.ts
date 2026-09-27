import { beforeEach, expect, it, vi } from "vitest";
import { ApiError, requireUser, requireParent, requirePair } from "./server-auth";
import type { User } from "@supabase/supabase-js";
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ supabaseServer: () => ({ auth: { getUser } }) }));
beforeEach(() => getUser.mockReset());
it("rejects requests without bearer auth before accessing data", async () => {
  await expect(requireUser(new Request("http://localhost/api/messages"))).rejects.toMatchObject({
    status: 401,
  });
  expect(getUser).not.toHaveBeenCalled();
});
it("checks token with Supabase instead of trusting a supplied user ID", async () => {
  getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
  await expect(
    requireUser(
      new Request("http://localhost/api/messages", { headers: { Authorization: "Bearer forged" } }),
    ),
  ).rejects.toMatchObject({ status: 401 });
  expect(getUser).toHaveBeenCalledWith("forged");
});
it("anonymous child sessions cannot issue parent pairing codes", () => {
  expect(() => requireParent({ is_anonymous: true } as User)).toThrow(ApiError);
});
it("pair access denies an unrelated account", async () => {
  const maybeSingle = async () => ({
    data: { id: "pair", parent_id: "parent", child_id: "child" },
    error: null,
  });
  const db = { from: () => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }) };
  await expect(
    requirePair(db as unknown as Parameters<typeof requirePair>[0], "pair", {
      id: "stranger",
    } as User),
  ).rejects.toMatchObject({ status: 404 });
});
