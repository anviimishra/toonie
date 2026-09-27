import { describe, expect, it } from "vitest";
import { ditherToMono } from "./print";

function pixels(values: [number, number, number, number][]) {
  return new Uint8ClampedArray(values.flat());
}

describe("ditherToMono", () => {
  it("keeps black and white as they are, fully opaque", () => {
    const data = pixels([
      [0, 0, 0, 255],
      [255, 255, 255, 255],
    ]);
    ditherToMono(data, 2, 1);
    expect([...data]).toEqual([0, 0, 0, 255, 255, 255, 255, 255]);
  });

  it("prints transparent pixels as white paper, not black", () => {
    const data = pixels([[0, 0, 0, 0]]);
    ditherToMono(data, 1, 1);
    expect([...data]).toEqual([255, 255, 255, 255]);
  });

  it("leaves only pure black or white, and mid-gray comes out about half black", () => {
    const size = 32;
    const data = new Uint8ClampedArray(size * size * 4).fill(128);
    for (let i = 3; i < data.length; i += 4) data[i] = 255; // opaque mid-gray
    ditherToMono(data, size, size);
    const values = new Set<number>();
    let black = 0;
    for (let i = 0; i < data.length; i += 4) {
      values.add(data[i]);
      if (data[i] === 0) black++;
    }
    expect([...values].sort((a, b) => a - b)).toEqual([0, 255]);
    expect(black / (size * size)).toBeGreaterThan(0.4);
    expect(black / (size * size)).toBeLessThan(0.6);
  });
});
