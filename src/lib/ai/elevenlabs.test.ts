import { describe, expect, it, vi } from "vitest";
import { cloneVoice, deleteVoice, speak } from "./elevenlabs";

describe("cloneVoice", () => {
  it("uploads the sample and returns the new voice id", async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response(JSON.stringify({ voice_id: "v123", requires_verification: false }), {
          status: 200,
        }),
    );
    const result = await cloneVoice(new Blob(["x"], { type: "audio/webm" }), "Toonie parent", {
      apiKey: "k",
      fetchImpl,
    });
    expect(result).toEqual({ voiceId: "v123", requiresVerification: false });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.elevenlabs.io/v1/voices/add");
    expect(init.headers).toEqual({ "xi-api-key": "k" });
    const form = init.body as FormData;
    expect(form.get("name")).toBe("Toonie parent");
    expect((form.get("files") as File).name).toBe("sample.webm");
  });

  it("reports when ElevenLabs refuses", async () => {
    const fetchImpl = vi.fn(async () => new Response("no", { status: 401 }));
    await expect(cloneVoice(new Blob(["x"]), "n", { apiKey: "k", fetchImpl })).rejects.toThrow(
      /401/,
    );
  });
});

describe("speak", () => {
  it("returns MP3 audio for the text in that voice", async () => {
    const fetchImpl = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    const audio = await speak("v123", "Hola", {
      apiKey: "k",
      model: "eleven_multilingual_v2",
      fetchImpl,
    });
    expect(audio.type).toBe("audio/mpeg");
    expect(audio.size).toBe(3);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(
      "https://api.elevenlabs.io/v1/text-to-speech/v123?output_format=mp3_44100_128",
    );
    expect(JSON.parse(init.body as string)).toEqual({
      text: "Hola",
      model_id: "eleven_multilingual_v2",
    });
  });
});

describe("deleteVoice", () => {
  it("treats an already-deleted voice as done", async () => {
    const fetchImpl = vi.fn(async () => new Response("", { status: 404 }));
    await expect(deleteVoice("gone", { apiKey: "k", fetchImpl })).resolves.toBeUndefined();
  });
});
