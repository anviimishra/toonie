import { expect, it } from "vitest";
import { isPng } from "./local-save";

it("recognises a PNG by its signature", () => {
  expect(isPng(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toBe(true);
  expect(isPng(new TextEncoder().encode("<svg>not a png</svg>"))).toBe(false);
  expect(isPng(new Uint8Array())).toBe(false);
});
