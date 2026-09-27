import { expect, it } from "vitest";
import { thermalDither } from "./thermal";
function swatch(r: number, g = r, b = r) {
  const pixels = new Uint8ClampedArray(16 * 16 * 4);
  for (let i = 0; i < pixels.length; i += 4) pixels.set([r, g, b, 255], i);
  thermalDither(pixels, 16);
  return Array.from(pixels).filter((_, i) => i % 4 === 0);
}
it("retains shading in dark skin rather than making it solid black", () => {
  const dark = swatch(72, 45, 32);
  expect(dark).toContain(0);
  expect(dark).toContain(255);
  expect(dark.filter((x) => x === 255).length).toBeGreaterThan(60);
});
it("preserves black ink and white paper", () => {
  expect(swatch(0).every((x) => x === 0)).toBe(true);
  expect(swatch(255).every((x) => x === 255)).toBe(true);
});
it("keeps dark fills darker than light fills", () => {
  const whiteDots = (values: number[]) => values.filter((x) => x === 255).length;
  expect(whiteDots(swatch(60))).toBeLessThan(whiteDots(swatch(160)));
  expect(whiteDots(swatch(160))).toBeLessThan(whiteDots(swatch(220)));
});
