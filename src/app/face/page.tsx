"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { RobotFace, type Mood } from "@/components/RobotFace";
import { ChildConnection } from "@/components/ChildConnection";
import { Button } from "@/components/Button";
import { LogoutIcon } from "@/components/icons";
import { ComicPanel } from "@/components/feed/ComicPanel";
import { ReadAloud } from "@/components/ReadAloud";
import { useRecorder } from "@/hooks/useRecorder";
import { checkDraft } from "@/features/stories";
import { useComicJob, jobSource } from "@/features/stories/useComicJob";
import { prepareStory, type PreparedStory, audioExtension } from "@/features/stories/submission";
import { renderSticker } from "@/features/stories/export-sticker";
import { deliverStory, getMessages, markRead, watchMessages } from "@/features/messages/client";
import type { ParentChildPair } from "@/lib/supabase/types";
import type { FeedItem } from "@/features/feed/types";
import type { Comic } from "@/types";

export default function Face() {
  return (
    <ChildConnection>
      {(pair, signOut) => <ConnectedFace pair={pair} signOut={signOut} />}
    </ChildConnection>
  );
}
function ConnectedFace({
  pair,
  signOut,
}: {
  pair: ParentChildPair;
  signOut: () => Promise<void>;
}) {
  const recorder = useRecorder();
  const resetRecorder = recorder.reset;
  const generation = useComicJob(true);
  const { start: startJob, dismiss: dismissJob, job: pendingJob } = generation;
  const restoredJob = useRef<string | null>(null);
  const [messages, setMessages] = useState<FeedItem[]>([]),
    [opened, setOpened] = useState<FeedItem | null>(null),
    [history, setHistory] = useState(false);
  const [activity, setActivity] = useState<"idle" | "listening" | "illustrating" | "sent">("idle"),
    [problem, setProblem] = useState(""),
    [stage, setStage] = useState("");
  const [preview, setPreview] = useState<{ comic: Comic; prepared: PreparedStory } | null>(null),
    [sending, setSending] = useState(false);
  const active = useRef(false),
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
    const check = checkDraft({ mode: "talk", audio, text: "", panelCount: 4 }, recorder.elapsedMs);
    if (!check.ok || !audio) {
      setProblem(check.ok ? "Record a story first." : check.reason);
      setActivity("idle");
      return;
    }
    active.current = true;
    setActivity("illustrating");
    setStage("Listening to your story…");
    void (async () => {
      try {
        const form = new FormData();
        form.set("audio", audio, `story.${audioExtension(audio.type)}`);
        form.set("panelCount", "4");
        form.set("pairId", pair.id);
        form.set("durationMs", String(recorder.elapsedMs));
        if (pendingJob) await dismissJob();
        await startJob(form);
      } catch (e) {
        if (mounted.current) {
          setActivity("idle");
        }
        if (mounted.current)
          setProblem(e instanceof Error ? e.message : "Couldn't make your comic. Try again.");
      } finally {
        active.current = false;
      }
    })();
  }, [
    activity,
    recorder.state,
    recorder.audio,
    recorder.elapsedMs,
    pair.id,
    startJob,
    dismissJob,
    pendingJob,
  ]);
  useEffect(() => {
    const job = generation.job;
    if (!job) return;
    if (job.status === "working") {
      setActivity("illustrating");
      setStage(job.stage + " " + job.drawn + "/" + job.panel_count + " panels finished");
      return;
    }
    if (job.status === "failed") {
      if (restoredJob.current !== job.id) {
        restoredJob.current = job.id;
        setActivity("idle");
        setProblem(job.error ?? "Please try recording again.");
      }
      return;
    }
    if (!job.comic || restoredJob.current === job.id) return;
    // Claim the job before any await so a re-render can't send it twice.
    restoredJob.current = job.id;
    setActivity("illustrating");
    setStage("Sending your comic to your grown-up…");
    const comic = job.comic;
    // Replies go straight to the parent feed once drawn; the preview screen
    // only appears if sending fails, so the child can retry.
    void (async () => {
      let prepared: PreparedStory | null = null;
      try {
        prepared = await prepareStory(job.id, comic, await jobSource(job), renderSticker);
        await deliverStory(prepared, pair.id, true);
        await dismissJob();
        resetRecorder();
        if (!mounted.current) return;
        setActivity("sent");
        void refresh();
      } catch (e) {
        if (!mounted.current) return;
        setActivity("idle");
        if (prepared) setPreview({ comic, prepared });
        else restoredJob.current = null;
        setProblem(e instanceof Error ? e.message : "Couldn't send. Try again.");
      }
    })();
  }, [generation.job, pair.id, dismissJob, resetRecorder, refresh]);
  async function sendReply() {
    if (!preview || sendLock.current) return;
    sendLock.current = true;
    setSending(true);
    setProblem("");
    try {
      await deliverStory(preview.prepared, pair.id, true);
      await generation.dismiss();
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
    if (generation.loading || generation.job?.status === "working") return;
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
  const alert =
    problem || generation.error ? (
      <p role="alert" className="rounded-lg bg-white p-3 text-red-700">
        {problem || generation.error}
      </p>
    ) : null;
  if (preview)
    return (
      <main className="mx-auto max-w-lg space-y-4 p-5">
        <h1 className="text-2xl font-black">{preview.comic.title}</h1>
        {preview.comic.panels.map((panel, index) => (
          <ComicPanel key={index} {...panel} number={index + 1} />
        ))}
        <p>{preview.comic.transcript}</p>
        {alert}
        <Button disabled={sending} onClick={sendReply} className="w-full">
          {sending ? "Sending…" : "Send to my grown-up"}
        </Button>
        <button
          disabled={sending}
          onClick={() => {
            void generation.dismiss().catch((e) => setProblem(e.message));
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
        {opened.direction === "received" && <ReadAloud messageId={opened.id} />}
        {opened.audioUrl && (
          <details>
            <summary>
              {opened.direction === "received" ? "Hear the original recording" : "Your recording"}
            </summary>
            <audio
              controls
              src={opened.audioUrl}
              aria-label="The original recording"
              className="mt-2 w-full"
            />
          </details>
        )}
        <details>
          <summary>Original story</summary>
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
            className="flex w-full items-center gap-4 rounded-xl border border-stone-200 p-3 text-left"
          >
            {(m.thumbnailUrl ?? m.imageUrl) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={m.thumbnailUrl ?? m.imageUrl}
                alt=""
                className="size-20 shrink-0 rounded-lg border border-stone-200 object-cover"
              />
            )}
            <span className="min-w-0">
              <span className="block font-bold">{m.title}</span>
              <span className="block text-sm">
                {m.direction === "sent" ? "You sent this" : "From your grown-up"}
                {m.status === "new" ? " · New" : ""}
              </span>
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
      {/* Whose tablet this is: the name the grown-up gave when connecting it. */}
      <p className="pointer-events-none absolute top-[max(env(safe-area-inset-top),1rem)] left-4 flex items-center gap-2 rounded-full bg-white/80 py-1.5 pr-4 pl-1.5 text-sm font-black text-stone-700 shadow-sm ring-1 ring-orange-100 backdrop-blur">
        <span
          aria-hidden="true"
          className="grid size-7 place-items-center rounded-full bg-accent text-xs text-white"
        >
          {pair.child_name.charAt(0).toUpperCase()}
        </span>
        {pair.child_name}
      </p>
      {/* Deliberately faint: for grown-ups switching a tablet to another code. */}
      <button
        onClick={() => {
          if (window.confirm(`Sign ${pair.child_name} out of this device?`))
            void signOut().catch((e) => setProblem(e.message));
        }}
        aria-label="Sign out of this device"
        className="absolute top-[max(env(safe-area-inset-top),1rem)] right-3 grid size-10 place-items-center rounded-full text-stone-400 opacity-40 hover:opacity-100"
      >
        <LogoutIcon className="size-5" />
      </button>
      <div className="pointer-events-none absolute inset-x-0 bottom-5 mx-auto max-w-md px-4 text-center">
        <p role="status" className="mb-3 font-bold">
          {activity === "illustrating"
            ? `${stage}. You can browse your comics or leave and come back.`
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
            disabled={activity === "listening"}
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
