import { describe, expect, it, vi } from "vitest";
import { extensionFor, transcribe } from "./transcribe";

function okResponse(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("transcribe", () => {
  it("posts the audio to xAI and returns the text", async () => {
    const fetchImpl = vi.fn(async () =>
      okResponse({ text: " Hi robot! ", language: "en", duration: 1.5, words: [] }),
    );

    const result = await transcribe(new Blob(["x"], { type: "audio/webm" }), {
      apiKey: "test-key",
      model: "grok-voice-transcribe-2.0",
      fetchImpl,
    });

    expect(result).toEqual({ text: "Hi robot!", language: "en", duration: 1.5 });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.x.ai/v1/stt");
    expect(init.headers).toEqual({ Authorization: "Bearer test-key" });
    const form = init.body as FormData;
    expect(form.get("model")).toBe("grok-voice-transcribe-2.0");
    // xAI requires the file to be the last field.
    expect([...form.keys()].at(-1)).toBe("file");
    expect((form.get("file") as File).name).toBe("story.webm");
  });

  it("sends the chosen language, English by default", async () => {
    const fetchImpl = vi.fn(async () => okResponse({ text: "Hola" }));
    await transcribe(new Blob(["x"]), { apiKey: "k", language: "es", fetchImpl });
    await transcribe(new Blob(["x"]), { apiKey: "k", fetchImpl });
    const sent = fetchImpl.mock.calls.map((call) =>
      ((call as unknown as [string, RequestInit])[1].body as FormData).get("language"),
    );
    expect(sent).toEqual(["es", "en"]);
  });

  it("throws with the status when xAI refuses", async () => {
    const fetchImpl = vi.fn(async () => new Response("bad key", { status: 401 }));
    await expect(transcribe(new Blob(["x"]), { apiKey: "nope", fetchImpl })).rejects.toThrow(
      /401.*bad key/,
    );
  });
});

describe("extensionFor", () => {
  it("maps browser recording types to file extensions", () => {
    expect(extensionFor("audio/webm;codecs=opus")).toBe("webm");
    expect(extensionFor("audio/mp4")).toBe("m4a");
    expect(extensionFor("audio/ogg;codecs=opus")).toBe("ogg");
    expect(extensionFor("")).toBe("webm");
  });
});
