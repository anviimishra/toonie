import { describe, expect, it, vi } from "vitest";
import { outputText, translate } from "./translate";

const reply = (text: string) =>
  new Response(
    JSON.stringify({ steps: [{ type: "model_output", content: [{ type: "text", text }] }] }),
    { status: 200 },
  );

describe("translate", () => {
  it("asks Gemini for a translation and returns the text", async () => {
    const fetchImpl = vi.fn(async () => reply("Hoy encontré una piedra."));
    const result = await translate("Today I found a rock.", {
      to: "Español",
      from: "English",
      apiKey: "k",
      model: "gemini-3.8-flash",
      fetchImpl,
    });
    expect(result).toBe("Hoy encontré una piedra.");
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/interactions");
    expect(init.headers).toMatchObject({ "x-goog-api-key": "k" });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: "gemini-3.8-flash", input: "Today I found a rock." });
    expect(body.system_instruction).toMatch(/from English into Español/);
  });

  it("skips the call when the languages match", async () => {
    const fetchImpl = vi.fn();
    expect(
      await translate(" Hola ", { to: "Español", from: "Español", apiKey: "k", fetchImpl }),
    ).toBe("Hola");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("throws with the status when Gemini refuses", async () => {
    const fetchImpl = vi.fn(async () => new Response("quota", { status: 429 }));
    await expect(translate("hi", { to: "Français", apiKey: "k", fetchImpl })).rejects.toThrow(
      /429.*quota/,
    );
  });
});

describe("outputText", () => {
  it("joins text from model_output steps only", () => {
    expect(
      outputText({
        steps: [
          { type: "user_input", content: [{ type: "text", text: "no" }] },
          {
            type: "model_output",
            content: [
              { type: "text", text: "Bon" },
              { type: "text", text: "jour" },
            ],
          },
        ],
      }),
    ).toBe("Bonjour");
    expect(outputText(null)).toBe("");
  });
});
