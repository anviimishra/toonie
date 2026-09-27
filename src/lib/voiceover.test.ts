import { describe, expect, it } from "vitest";
import { planVoiceover } from "./voiceover";

const fromParent = { sender_role: "parent" as const, audio_path: "p/m/voice" };
const consented = { voice_consent_at: "2026-09-27T00:00:00Z", voice_id: null };

describe("planVoiceover", () => {
  it("translates into the child's language and clones the consenting parent from the story clip", () => {
    expect(planVoiceover(fromParent, consented, { language: "es" })).toEqual({
      to: "es",
      voice: { kind: "clone", samplePath: "p/m/voice" },
    });
  });

  it("reuses a voice that was already cloned", () => {
    const plan = planVoiceover(fromParent, { ...consented, voice_id: "v1" }, { language: "es" });
    expect(plan.voice).toEqual({ kind: "use", voiceId: "v1" });
  });

  it("never clones without the parent's consent", () => {
    const plan = planVoiceover(
      fromParent,
      { voice_consent_at: null, voice_id: null },
      { language: "es" },
    );
    expect(plan.voice).toEqual({ kind: "none", note: "voice-off" });
  });

  it("can't clone from a typed story with no voice clip", () => {
    const plan = planVoiceover({ ...fromParent, audio_path: null }, consented, { language: "fr" });
    expect(plan.voice).toEqual({ kind: "none", note: "no-sample" });
  });

  it("translates into the child's language no matter what the parent's settings say", () => {
    // Regression: a Hindi story wasn't translated because both settings said English.
    expect(planVoiceover(fromParent, consented, { language: "en" }).to).toBe("en");
  });

  it("falls back to English for a missing or unknown child language", () => {
    expect(planVoiceover(fromParent, null, { language: "klingon" }).to).toBe("en");
  });

  it("refuses to voice a child's story", () => {
    expect(() =>
      planVoiceover({ sender_role: "child", audio_path: "c/m/voice" }, consented, {
        language: "es",
      }),
    ).toThrow(/grown-up/);
  });
});
