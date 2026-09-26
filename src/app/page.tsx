"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { PanelCountPicker } from "@/components/PanelCountPicker";
import { RecordButton } from "@/components/RecordButton";
import { useCurrentUser } from "@/features/auth";
import {
  PANEL_COUNT_DEFAULT,
  type DraftMode,
  type StoryDraft,
  checkDraft,
  stories,
} from "@/features/stories";
import { useRecorder } from "@/hooks/useRecorder";

/**
 * The home screen is the record screen. Telling a story is the whole app, so
 * it is the first thing you see rather than something behind a menu.
 */
export default function RecordPage() {
  const { user } = useCurrentUser();
  const recorder = useRecorder();

  const [mode, setMode] = useState<DraftMode>("talk");
  const [text, setText] = useState("");
  const [panelCount, setPanelCount] = useState(PANEL_COUNT_DEFAULT);
  const [sending, setSending] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  const draft: StoryDraft = { mode, audio: recorder.audio, text, panelCount };

  async function send() {
    const check = checkDraft(draft, recorder.elapsedMs);
    if (!check.ok) {
      setProblem(check.reason);
      return;
    }

    setProblem(null);
    setSending(true);
    try {
      const story = await stories.create(draft);
      setSentId(story.id);
    } catch {
      setProblem("That did not send. Try again in a moment.");
    } finally {
      setSending(false);
    }
  }

  function startOver() {
    recorder.reset();
    setText("");
    setSentId(null);
    setProblem(null);
  }

  if (sentId) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="text-7xl" aria-hidden="true">
          ✏️
        </div>
        <h1 className="text-3xl font-extrabold">Drawing your comic…</h1>
        <p className="text-muted">
          We will pop it on the other screen as soon as it is ready. It usually takes a minute.
        </p>
        <Button onClick={startOver}>Tell another</Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-7 px-6 py-8">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold">Toonie</h1>
        <p className="text-muted mt-1 font-semibold">
          {user ? `Hi ${user.displayName}! What happened today?` : "What happened today?"}
        </p>
      </header>

      {/* Talk is the default; typing is there for a loud room or a blocked mic. */}
      <div role="tablist" aria-label="How to tell it" className="flex gap-2 self-center">
        {(["talk", "type"] as const).map((option) => (
          <button
            key={option}
            role="tab"
            type="button"
            aria-selected={mode === option}
            onClick={() => {
              setMode(option);
              setProblem(null);
            }}
            className={[
              "rounded-full px-5 py-2 text-sm font-bold transition",
              "focus-visible:ring-4 focus-visible:ring-accent/40 focus-visible:outline-none",
              mode === option
                ? "bg-foreground text-background"
                : "border border-stone-300 bg-white",
            ].join(" ")}
          >
            {option === "talk" ? "Talk" : "Type"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        {mode === "talk" ? (
          <>
            <RecordButton
              state={recorder.state}
              elapsedMs={recorder.elapsedMs}
              onStart={recorder.start}
              onStop={recorder.stop}
            />
            {recorder.audioUrl && (
              <audio
                controls
                src={recorder.audioUrl}
                className="w-full"
                aria-label="Listen to your story"
              />
            )}
          </>
        ) : (
          <label className="w-full">
            <span className="sr-only">Your story</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setProblem(null);
              }}
              rows={7}
              placeholder="Today I found a very round rock and named it Kevin…"
              className="w-full rounded-3xl border border-stone-300 bg-white p-4 text-lg focus:ring-4 focus:ring-accent/30 focus:outline-none"
            />
          </label>
        )}
      </div>

      <PanelCountPicker value={panelCount} onChange={setPanelCount} disabled={sending} />

      {problem && (
        <p role="alert" className="text-center text-sm font-semibold text-red-600">
          {problem}
        </p>
      )}

      <Button onClick={send} disabled={sending} className="w-full">
        {sending ? "Sending…" : "Make my comic"}
      </Button>
    </main>
  );
}
