"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { RobotFace, type Mood } from "@/components/RobotFace";
import { ChildConnection } from "@/components/ChildConnection";
import { Button } from "@/components/Button";
import { StickerComic } from "@/components/feed/StickerComic";
import { useRecorder } from "@/hooks/useRecorder";
import { checkDraft } from "@/features/stories";
import { apiFetch } from "@/lib/api-client";
import { readComicStream } from "@/features/stories/generate";
import { prepareStory, type PreparedStory, audioExtension } from "@/features/stories/submission";
import { renderSticker } from "@/features/stories/export-sticker";
import { deliverStory, getMessages, markRead, watchMessages } from "@/features/messages/client";
import type { ParentChildPair } from "@/lib/supabase/types";
import type { FeedItem } from "@/features/feed/types";
import type { Comic } from "@/types";

export default function Face() {
  return <ChildConnection>{(pair) => <ConnectedFace pair={pair} />}</ChildConnection>;
}
function ConnectedFace({ pair }: { pair: ParentChildPair }) {
  const recorder = useRecorder();
  const [messages, setMessages] = useState<FeedItem[]>([]),
    [opened, setOpened] = useState<FeedItem | null>(null),
    [history, setHistory] = useState(false);
  const [activity, setActivity] = useState<"idle" | "listening" | "illustrating" | "sent">("idle"),
    [problem, setProblem] = useState(""),
    [stage, setStage] = useState("");
  const [preview, setPreview] = useState<{ comic: Comic; prepared: PreparedStory } | null>(null),
    [sending, setSending] = useState(false);
  const active = useRef<AbortController | null>(null),
    sendLock = useRef(false),
    mounted = useRef(true);
  const refresh = useCallback(async () => {
    try {
      const items = await getMessages(true);
      if (mounted.current) setMessages(items.filter((item) => item.pairId === pair.id));
    } catch (e) {
      if (mounted.current) setProblem(e instanceof Error ? e.message : "Couldn't load mail.");
    }
  }, [pair.id]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const stop = watchMessages(() => void refresh(), true);
    return () => {
      mounted.current = false;
      stop();
      active.current?.abort();
    };
  }, [refresh]);
  useKeepAwake();
  const unread = messages.filter((m) => m.direction === "received" && m.status === "new");
  const mood: Mood = activity !== "idle" ? activity : unread.length ? "mail" : "sleeping";
  useEffect(() => {
    if (
      activity === "listening" &&
      (recorder.state === "denied" || recorder.state === "unsupported")
    ) {
      setActivity("idle");
      setProblem("Microphone unavailable. Allow microphone access and use HTTPS or localhost.");
    }
  }, [activity, recorder.state]);
  useEffect(() => {
    if (activity !== "sent") return;
    const timer = setTimeout(() => setActivity("idle"), 2000);
    return () => clearTimeout(timer);
  }, [activity]);
  // Each stopped take starts one backend request. The ref prevents duplicate effect runs.
  useEffect(() => {
    if (activity !== "listening" || recorder.state !== "recorded" || active.current) return;
    const audio = recorder.audio;
    const check = checkDraft({ mode: "talk", audio, text: "", panelCount: 3 }, recorder.elapsedMs);
    if (!check.ok || !audio) {
      setProblem(check.ok ? "Record a story first." : check.reason);
      setActivity("idle");
      return;
    }
    const controller = new AbortController();
    active.current = controller;
    setActivity("illustrating");
    setStage("Listening to your story…");
    void (async () => {
      try {
        const form = new FormData();
        form.set("audio", audio, `story.${audioExtension(audio.type)}`);
        form.set("panelCount", "3");
        form.set("pairId", pair.id);
        const response = await apiFetch(
          "/api/comics",
          { method: "POST", body: form, signal: controller.signal },
          true,
        );
        let originalTranscript: string | null = null;
        const comic = await readComicStream(response, (event) => {
          if (event.type === "transcribed") {
            originalTranscript = event.transcript;
            setStage("Writing your comic…");
          }
          if (event.type === "scripted") setStage("Drawing your comic…");
        });
        const prepared = await prepareStory(
          crypto.randomUUID(),
          comic,
          {
            kind: "voice",
            audio,
            durationMs: recorder.elapsedMs,
            originalTranscript,
          },
          renderSticker,
        );
        if (mounted.current) setPreview({ comic, prepared });
      } catch (e) {
        if (mounted.current && !controller.signal.aborted)
          setProblem(e instanceof Error ? e.message : "Couldn't make your comic. Try again.");
      } finally {
        active.current = null;
        if (mounted.current) setActivity("idle");
      }
    })();
  }, [activity, recorder.state, recorder.audio, recorder.elapsedMs, pair.id]);
  async function sendReply() {
    if (!preview || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setProblem("");
    try {
      await deliverStory(preview.prepared, pair.id, true);
      setPreview(null);
      recorder.reset();
      setActivity("sent");
      void refresh();
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "Couldn't send. Try again.");
    } finally {
      sendLock.current = false;
      setSending(false);
    }
  }
  function tap() {
    setProblem("");
    goFullscreen();
    if (mood === "mail") {
      setOpened(unread[0]);
      return;
    }
    if (mood === "sleeping") {
      setActivity("listening");
      void recorder.start();
    } else if (mood === "listening" && recorder.state === "recording") recorder.stop();
  }
  const alert = problem ? (
    <p role="alert" className="rounded-lg bg-white p-3 text-red-700">
      {problem}
    </p>
  ) : null;
  if (preview)
    return (
      <main className="mx-auto max-w-lg space-y-4 p-5">
        <h1 className="text-2xl font-black">{preview.comic.title}</h1>
        <StickerComic title={preview.comic.title} panels={preview.comic.panels} />
        <p>{preview.comic.transcript}</p>
        {alert}
        <Button disabled={sending} onClick={sendReply} className="w-full">
          {sending ? "Sending…" : "Send to my grown-up"}
        </Button>
        <button
          disabled={sending}
          onClick={() => {
            setPreview(null);
            recorder.reset();
          }}
          className="w-full py-3 underline"
        >
          Record a different story
        </button>
      </main>
    );
  if (opened)
    return (
      <main className="mx-auto max-w-lg space-y-4 p-5">
        <button onClick={() => setOpened(null)} className="py-2 font-bold underline">
          Back to Toonie
        </button>
        <h1 className="text-2xl font-black">{opened.title}</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={opened.imageUrl}
          alt={opened.title}
          className="w-full rounded-xl"
          onLoad={() => {
            if (opened.direction === "received" && opened.status === "new")
              void markRead(opened.id, true)
                .then(refresh)
                .catch(() =>
                  setProblem("Comic opened, but read status didn't save. Reopen it to retry."),
                );
          }}
          onError={() => setProblem("The comic couldn't load. Go back and reopen it to retry.")}
        />
        {opened.audioUrl && (
          <audio
            controls
            src={opened.audioUrl}
            aria-label="Listen to the story"
            className="w-full"
          />
        )}
        <details>
          <summary>Story</summary>
          <p className="mt-2 whitespace-pre-wrap">{opened.transcript}</p>
        </details>
        {alert}
      </main>
    );
  if (history)
    return (
      <main className="mx-auto max-w-lg space-y-4 p-5">
        <button onClick={() => setHistory(false)} className="underline">
          Back to Toonie
        </button>
        <h1 className="text-2xl font-black">Your comics</h1>
        {!messages.length && <p>No comics yet. Your grown-up can send you one.</p>}
        {messages.map((m) => (
          <button
            key={m.id}
            onClick={() => setOpened(m)}
            className="block w-full rounded-xl border border-stone-200 p-4 text-left"
          >
            <span className="font-bold">{m.title}</span>
            <span className="block text-sm">
              {m.direction === "sent" ? "You sent this" : "From your grown-up"}
              {m.status === "new" ? " · New" : ""}
            </span>
          </button>
        ))}
        {alert}
      </main>
    );
  return (
    <main className="relative h-dvh bg-background">
      <button
        onClick={tap}
        disabled={
          activity === "illustrating" || activity === "sent" || recorder.state === "requesting"
        }
        aria-label={
          mood === "mail"
            ? "Open new comic"
            : mood === "listening"
              ? "Tap to stop recording"
              : "Tap to record a story"
        }
        className="absolute inset-0 flex w-full items-center justify-center"
      >
        <RobotFace mood={mood} className="h-full w-full" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto max-w-md px-4 text-center">
        <p role="status" className="mb-3 font-bold">
          {activity === "illustrating"
            ? stage
            : activity === "sent"
              ? "Sent to your grown-up!"
              : mood === "mail"
                ? "You have a new comic. Tap to open."
                : mood === "listening"
                  ? "Listening… tap to stop."
                  : "Tap to tell your grown-up a story."}
        </p>
        <div className="pointer-events-auto">
          {alert}
          <button
            disabled={activity !== "idle"}
            onClick={() => {
              void refresh();
              setHistory(true);
            }}
            className="rounded-full bg-white px-5 py-2 font-bold"
          >
            Your comics
          </button>
          <Link href="/start" className="ml-4 text-sm underline">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

/** Best effort: go fullscreen so browser bars don't cover the face. Not available on iPhone. */
function goFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    root
      .requestFullscreen()
      .catch((error) => console.warn("Fullscreen unavailable", error.message));
  }
}

/** Best effort: stop the screen from dimming while the face is showing. */
function useKeepAwake() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        ?.request("screen")
        .then((l) => {
          lock = l;
        })
        .catch((error) => console.warn("Wake lock unavailable", error.message));
    };
    request();
    // The lock drops when the tab is hidden; take it again on return.
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, []);
}
