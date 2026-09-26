import { describe, expect, it } from "vitest";
import { PRINT_WIDTH_PX, panelCountSchema, panelSchema, storyScriptSchema } from "./story";

describe("panelCountSchema", () => {
  it("coerces the string a multipart form actually sends", () => {
    expect(panelCountSchema.parse("4")).toBe(4);
  });

  it.each([0, 7, -1, 2.5])("rejects %s", (value) => {
    expect(panelCountSchema.safeParse(value).success).toBe(false);
  });

  it.each([1, 3, 6])("accepts %s", (value) => {
    expect(panelCountSchema.parse(value)).toBe(value);
  });

  it("rejects text that is not a number", () => {
    expect(panelCountSchema.safeParse("lots").success).toBe(false);
  });
});

describe("panelSchema", () => {
  it("needs something to draw", () => {
    expect(panelSchema.safeParse({ scene: "", caption: "hi" }).success).toBe(false);
  });

  it("allows a panel with no caption", () => {
    expect(panelSchema.parse({ scene: "a dog on a skateboard", caption: "" }).caption).toBe("");
  });
});

describe("storyScriptSchema", () => {
  const panel = { scene: "a dog", caption: "woof" };

  it.each([1, 6])("accepts a %s-panel script", (n) => {
    expect(storyScriptSchema.parse({ panels: Array(n).fill(panel) }).panels).toHaveLength(n);
  });

  it.each([0, 7])("rejects a %s-panel script", (n) => {
    expect(storyScriptSchema.safeParse({ panels: Array(n).fill(panel) }).success).toBe(false);
  });
});

describe("print width", () => {
  it("is the 384 dots of 58mm thermal paper", () => {
    expect(PRINT_WIDTH_PX).toBe(384);
  });
});
