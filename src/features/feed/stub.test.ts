import { describe, expect, it } from "vitest";
import { PANEL_COUNT_MAX, PANEL_COUNT_MIN, storyScriptSchema } from "@/types";
import { createStubFeed } from "./stub";

describe("createStubFeed", () => {
  it("lists newest first", async () => {
    const items = await createStubFeed(Date.now(), 0).list();
    const times = items.map((item) => Date.parse(item.createdAt));
    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it("only has comics with a legal number of panels", async () => {
    for (const item of await createStubFeed(Date.now(), 0).list()) {
      expect(item.panels.length).toBeGreaterThanOrEqual(PANEL_COUNT_MIN);
      expect(item.panels.length).toBeLessThanOrEqual(PANEL_COUNT_MAX);
      expect(storyScriptSchema.safeParse({ panels: item.panels }).success).toBe(true);
    }
  });

  it("returns null for an unknown id", async () => {
    expect(await createStubFeed(Date.now(), 0).get("nope")).toBeNull();
  });

  it("remembers what has been seen", async () => {
    const adapter = createStubFeed(Date.now(), 0);
    const unseen = (await adapter.list()).find((item) => item.status === "new");
    expect(unseen).toBeDefined();
    await adapter.markSeen(unseen!.id);
    expect((await adapter.get(unseen!.id))?.status).toBe("seen");
  });

  it("does not let callers mutate its data", async () => {
    const adapter = createStubFeed(Date.now(), 0);
    const [first] = await adapter.list();
    first.title = "changed";
    first.panels[0].caption = "changed";
    const again = await adapter.get(first.id);
    expect(again?.title).not.toBe("changed");
    expect(again?.panels[0].caption).not.toBe("changed");
  });
});
