import { expect, it } from "vitest";
import { readComicStream } from "./generate";

const comic = {
  title: "Café",
  transcript: "I visited a café.",
  panels: [{ scene: "A café", caption: "Coffee!", imageUrl: "data:image/jpeg;base64,YQ==" }],
};
it("handles arbitrary byte boundaries and a final line without a newline", async () => {
  const bytes = new TextEncoder().encode(JSON.stringify({ type: "done", comic }));
  const response = new Response(
    new ReadableStream({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    }),
  );
  expect(await readComicStream(response, () => {})).toEqual(comic);
});
it("rejects disconnected streams instead of accepting a partial comic", async () => {
  await expect(
    readComicStream(new Response('{"type":"transcribed","transcript":"hello"}\n'), () => {}),
  ).rejects.toThrow("before your comic was complete");
});
it("surfaces server validation errors", async () => {
  await expect(
    readComicStream(
      Response.json({ error: { message: "Save your avatar first" } }, { status: 400 }),
      () => {},
    ),
  ).rejects.toThrow("Save your avatar first");
});
