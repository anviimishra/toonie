import { describe, expect, it } from "vitest";
import { MIN_RECORDING_MS, checkDraft, formatDuration } from "./draft";
import type { StoryDraft } from "./types";

function draft(over: Partial<StoryDraft> = {}): StoryDraft {
  return { mode: "type", audio: null, text: "", panelCount: 4, ...over };
}

const audio = (size: number) => ({ size }) as Blob;

describe("checkDraft, panel count", () => {
  it.each([0, 7, -1])("rejects %s panels", (panelCount) => {
    const result = checkDraft(draft({ text: "a long enough story", panelCount }));
    expect(result).toMatchObject({ ok: false });
  });

  it("rejects a fractional count", () => {
    expect(checkDraft(draft({ text: "a long enough story", panelCount: 2.5 }))).toMatchObject({
      ok: false,
    });
  });

  it.each([1, 6])("accepts %s panels", (panelCount) => {
    expect(checkDraft(draft({ text: "a long enough story", panelCount }))).toEqual({ ok: true });
  });
});

describe("checkDraft, typed stories", () => {
  it("asks for more when the story is too short", () => {
    const result = checkDraft(draft({ text: "hi" }));
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/write a little more/i);
  });

  it("does not count whitespace as a story", () => {
    expect(checkDraft(draft({ text: "          " }))).toMatchObject({ ok: false });
  });

  it("accepts a real one", () => {
    expect(checkDraft(draft({ text: "We found a very round rock today." }))).toEqual({ ok: true });
  });
});

describe("checkDraft, recorded stories", () => {
  it("needs audio", () => {
    const result = checkDraft(draft({ mode: "talk" }), 5000);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/hold the button/i);
  });

  it("rejects an empty blob", () => {
    expect(checkDraft(draft({ mode: "talk", audio: audio(0) }), 5000)).toMatchObject({ ok: false });
  });

  it("rejects a mis-tap", () => {
    const result = checkDraft(draft({ mode: "talk", audio: audio(1024) }), MIN_RECORDING_MS - 1);
    expect(result).toMatchObject({ ok: false });
    if (!result.ok) expect(result.reason).toMatch(/too short/i);
  });

  it("accepts a real recording", () => {
    expect(checkDraft(draft({ mode: "talk", audio: audio(2048) }), 4000)).toEqual({ ok: true });
  });

  it("ignores the text field when talking", () => {
    expect(checkDraft(draft({ mode: "talk", audio: audio(2048), text: "" }), 4000)).toEqual({
      ok: true,
    });
  });
});

describe("formatDuration", () => {
  it.each([
    [0, "0:00"],
    [1000, "0:01"],
    [9000, "0:09"],
    [60000, "1:00"],
    [65000, "1:05"],
    [605000, "10:05"],
  ])("renders %sms as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it("does not show negative time", () => {
    expect(formatDuration(-500)).toBe("0:00");
  });
});
