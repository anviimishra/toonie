import { describe, expect, it } from "vitest";
import { groupIntoRows, panelRows } from "./layout";

describe("panelRows", () => {
  it.each([
    [1, [1]],
    [2, [2]],
    [3, [1, 2]],
    [4, [2, 2]],
    [5, [2, 3]],
    [6, [3, 3]],
  ])("lays out %s panels as %j", (count, rows) => {
    expect(panelRows(count)).toEqual(rows);
  });

  it.each([1, 2, 3, 4, 5, 6])("places every one of %s panels", (count) => {
    expect(panelRows(count).reduce((sum, n) => sum + n, 0)).toBe(count);
  });

  it("never puts more than three in a row", () => {
    for (let count = 1; count <= 6; count++) {
      expect(Math.max(...panelRows(count))).toBeLessThanOrEqual(3);
    }
  });

  it("has nothing to lay out for zero or negative counts", () => {
    expect(panelRows(0)).toEqual([]);
    expect(panelRows(-2)).toEqual([]);
  });

  it("caps at six panels", () => {
    expect(panelRows(9)).toEqual([3, 3]);
  });
});

describe("groupIntoRows", () => {
  it("splits items in reading order", () => {
    expect(groupIntoRows(["a", "b", "c", "d", "e"])).toEqual([
      ["a", "b"],
      ["c", "d", "e"],
    ]);
  });

  it("gives a single panel its own row", () => {
    expect(groupIntoRows(["a"])).toEqual([["a"]]);
  });

  it("returns no rows for no items", () => {
    expect(groupIntoRows([])).toEqual([]);
  });

  it("drops anything past six", () => {
    const rows = groupIntoRows([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(rows.flat()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
