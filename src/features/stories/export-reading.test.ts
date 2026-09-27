import { afterEach, expect, it, vi } from "vitest";
import { renderReadingComic } from "./export-reading";
afterEach(() => vi.unstubAllGlobals());
it("exports a tall reading comic with wrapped, readable captions", async () => {
  const words: string[] = [];
  const context = {
    font: "",
    textBaseline: "",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    measureText: (text: string) => ({ width: text.length * 28 }),
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    strokeRect: vi.fn(),
    fillText: (line: string) => words.push(line),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: () => context,
    toBlob: (done: (blob: Blob) => void) => done(new Blob(["png"], { type: "image/png" })),
  };
  vi.stubGlobal("document", { fonts: { ready: Promise.resolve() }, createElement: () => canvas });
  vi.stubGlobal(
    "Image",
    class {
      naturalWidth = 512;
      naturalHeight = 512;
      src = "";
      crossOrigin = "";
      decode() {
        return Promise.resolve();
      }
    },
  );
  const caption =
    "I found a tiny rock at the park and named it Kevin. Then I took Kevin home to show my family.";
  const blob = await renderReadingComic([
    { scene: "A rock", caption, imageUrl: "data:image/png;base64,YQ==" },
    {
      scene: "Home",
      caption: "Welcome home, Kevin!",
      dialogue: [{ speaker: "Me", text: "Hello!" }],
      imageUrl: "data:image/png;base64,YQ==",
    },
  ]);
  expect(blob.type).toBe("image/png");
  expect(canvas.height).toBeGreaterThan(canvas.width * 2);
  expect(words.join(" ")).toBe(`${caption} Welcome home, Kevin! Me: \u201cHello!\u201d`);
  expect(words.every((line) => line.length * 28 <= 1056)).toBe(true);
  expect(context.drawImage).toHaveBeenCalledTimes(2);
});
