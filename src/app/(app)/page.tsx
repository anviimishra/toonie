"use client";

import { useState } from "react";
import { Button } from "@/components/Button";
import { FaceIcon, KeyboardIcon, MicIcon, SparkleIcon } from "@/components/icons";
import { PanelCountPicker } from "@/components/PanelCountPicker";
import { RecordButton } from "@/components/RecordButton";
import { Segmented } from "@/components/Segmented";
import { useCurrentUser } from "@/features/auth";
import {
  PANEL_COUNT_DEFAULT,
  type DraftMode,
  type StoryDraft,
  checkDraft,
  stories,
} from "@/features/stories";
import { useRecorder } from "@/hooks/useRecorder";

const MODES = [
  { value: "talk", label: "Talk", Icon: MicIcon },
  { value: "type", label: "Type", Icon: KeyboardIcon },
] as const;

/**
 * The home screen is the record screen. Telling a story is the whole app, so
 * it is the first thing you see rather than something behind a menu.
 *
 * Laid out to fit a phone without scrolling: header, the button filling the
 * middle, and a raised card at the bottom holding everything you do last.
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
  const hasSomething = mode === "talk" ? recorder.audio !== null : text.trim().length > 0;

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
      setProblem("That didn't send. Try again in a moment.");
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
      <section className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center">
        <div className="relative grid size-40 place-items-center">
          <span className="animate-breathe absolute inset-0 rounded-full bg-orange-300/40 motion-reduce:animate-none" />
          <span className="relative grid size-28 place-items-center rounded-full bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised">
            <SparkleIcon className="size-12" />
          </span>
        </div>
        <div>
          <h1 className="text-3xl font-black">Drawing your comic…</h1>
          <p className="mt-2 text-stone-500">
            It&apos;ll pop up on the other screen in about a minute.
          </p>
        </div>
        <Button onClick={startOver}>Tell another story</Button>
      </section>
    );
  }

  const initial = user?.displayName?.charAt(0).toUpperCase();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-orange-500 uppercase">Toonie</p>
          <h1 className="text-[1.7rem] leading-tight font-black">
            {user ? `Hi ${user.displayName}!` : "What happened today?"}
          </h1>
        </div>
        <span
          aria-label={user ? `Signed in as ${user.displayName}` : "Not signed in"}
          className="grid size-11 place-items-center rounded-full bg-linear-to-b from-amber-200 to-orange-300 text-lg font-black text-orange-900 shadow-[0_4px_10px_-2px_rgb(103_29_154/0.35),inset_0_1px_0_rgb(255_255_255/0.6)] ring-2 ring-white"
        >
          {initial ?? <FaceIcon className="size-6" />}
        </span>
      </header>

      <div className="mt-4 flex justify-center px-6">
        <Segmented
          label="How to tell your story"
          options={MODES}
          value={mode}
          onChange={(next) => {
            setMode(next);
            setProblem(null);
          }}
        />
      </div>

      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-3 [container-type:size]">
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
                aria-label="Listen back to your story"
                className="mt-1 h-10 w-full max-w-xs"
              />
            )}
          </>
        ) : (
          <label className="flex h-full max-h-80 w-full flex-col">
            <span className="sr-only">Your story</span>
            <textarea
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setProblem(null);
              }}
              placeholder="Today I found a very round rock and named it Kevin…"
              className="h-full w-full resize-none rounded-3xl bg-white/90 p-5 text-lg leading-relaxed shadow-[inset_0_2px_6px_rgb(83_25_123/0.12),0_1px_0_rgb(255_255_255)] ring-1 ring-orange-100 placeholder:text-stone-400 focus:ring-4 focus:ring-orange-300/50 focus:outline-none"
            />
          </label>
        )}
      </section>

      <div className="mx-3 mb-3 rounded-[28px] bg-white/90 p-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
        <PanelCountPicker value={panelCount} onChange={setPanelCount} disabled={sending} />

        {problem && (
          <p role="alert" className="mt-3 text-center text-sm font-bold text-red-600">
            {problem}
          </p>
        )}

        <Button onClick={send} disabled={sending || !hasSomething} className="mt-4 w-full">
          <SparkleIcon className="size-5" />
          {sending ? "Sending…" : "Make my comic"}
        </Button>
      </div>
    </div>
  );
}
