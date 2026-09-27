import { describe, expect, it } from "vitest";
import { stickerAspectRatio, stickerRects } from "./sticker";

describe("square sticker composition", () => {
  it.each([1, 2, 3, 4])(
    "keeps %i panels inside the square with margins and no overlap",
    (count) => {
      const rects = stickerRects(count, 1200);
      for (const rect of rects) {
        expect(rect.x).toBeGreaterThan(0);
        expect(rect.y).toBeGreaterThan(0);
        expect(rect.x + rect.width).toBeLessThan(1200);
        expect(rect.y + rect.height).toBeLessThan(1200);
      }
      rects.forEach((a, i) =>
        rects.slice(i + 1).forEach((b) => {
          expect(
            a.x + a.width <= b.x ||
              b.x + b.width <= a.x ||
              a.y + a.height <= b.y ||
              b.y + b.height <= a.y,
          ).toBe(true);
        }),
      );
    },
  );
  it("gives the three-panel story a wide ending", () => {
    const rects = stickerRects(3);
    expect(rects[2].width).toBeGreaterThan(rects[0].width);
    expect(stickerAspectRatio(3, 2)).toBe("2:1");
    expect(stickerAspectRatio(3, 0)).toBe("1:1");
  });
  it("rejects five panels rather than shrinking them to unreadable size", () => {
    expect(() => stickerRects(5)).toThrow();
  });
});
