"use client";

import { useEffect, useRef, useState } from "react";
import { RobotFace, type Mood } from "@/components/RobotFace";
import { useRobotState } from "@/features/receiver";
import { PANEL_COUNT_DEFAULT, checkDraft, stories, type StoryDraft } from "@/features/stories";
import { useRecorder } from "@/hooks/useRecorder";

/** Keep the drawing face up at least this long, even if sending is quick. */
const MIN_ILLUSTRATING_MS = 3000;
/** How long the happy "sent" face stays before going back to sleep. */
const SENT_MS = 3000;

/** What the robot is busy with. When idle, it's asleep or showing mail. */
type Activity = "idle" | "listening" | "illustrating" | "sent";

/**
 * The kid's screen: the whole display is the robot's face, meant for a phone
 * lying sideways. Nothing else is drawn.
 *
 *   sleeping --tap--> listening --tap--> illustrating --> sent --> sleeping
 *   sleeping --mail arrives--> mail --tap--> sleeping
 *
 * Dev only: press "m" to toggle mail.
 */
export default function Face() {
  const recorder = useRecorder();
  const { mailReceived, toggleMail, clearMail, reportMood } = useRobotState();
  const [activity, setActivity] = useState<Activity>("idle");
  const [problem, setProblem] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Mail only shows when the robot isn't busy, so it never interrupts a story.
  const mood: Mood = activity !== "idle" ? activity : mailReceived ? "mail" : "sleeping";

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useKeepAwake();

  // Debug trail in the browser console: every mood, recorder, and mail change.
  useEffect(() => log("mood →", mood), [mood]);
  useEffect(() => log("recorder →", recorder.state), [recorder.state]);
  useEffect(() => log("mailReceived →", mailReceived), [mailReceived]);

  // Keep Supabase's robot_states row in step with what the face shows.
  useEffect(() => reportMood(mood), [mood, reportMood]);

  function goToSleep(message: string | null = null) {
    log("going to sleep", message ? `(${message})` : "");
    recorder.reset();
    setActivity("idle");
    setProblem(message);
  }

  // The mic can fail after we've switched to listening; fall back to sleep.
  useEffect(() => {
    if (activity !== "listening") return;
    if (recorder.state === "denied") goToSleep("Microphone is blocked.");
    if (recorder.state === "unsupported") {
      // Browsers hide the mic entirely on insecure pages (http:// anything but localhost).
      log("can't record here", {
        secureContext: window.isSecureContext,
        mediaDevices: !!navigator.mediaDevices,
        mediaRecorder: typeof MediaRecorder !== "undefined",
        url: location.origin,
      });
      goToSleep(
        window.isSecureContext
          ? "This browser can't record."
          : "Recording needs https or localhost.",
      );
    }
    // goToSleep only touches state setters and recorder.reset, which are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, recorder.state]);

  // Once the recording is in, send it off while the robot draws.
  useEffect(() => {
    if (activity !== "listening" || recorder.state !== "recorded") return;

    const draft: StoryDraft = {
      mode: "talk",
      audio: recorder.audio,
      text: "",
      panelCount: PANEL_COUNT_DEFAULT,
    };
    const check = checkDraft(draft, recorder.elapsedMs);
    log("recording done", {
      ms: recorder.elapsedMs,
      bytes: recorder.audio?.size ?? 0,
      ok: check.ok,
    });
    if (!check.ok) {
      goToSleep(check.reason);
      return;
    }

    setActivity("illustrating");
    const minWait = new Promise((resolve) => setTimeout(resolve, MIN_ILLUSTRATING_MS));
    const audio = recorder.audio!;
    Promise.all([transcribeRecording(audio), stories.create(draft), minWait])
      .then(([transcript, story]) => {
        log("transcript:", transcript);
        log("story sent", story);
        setActivity("sent");
        timers.current.push(setTimeout(() => goToSleep(), SENT_MS));
      })
      .catch((error) => {
        console.error("[face] sending failed", error);
        goToSleep("That didn't send.");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity, recorder.state]);

  function tap() {
    log("tap while", mood);
    goFullscreen();
    setProblem(null);
    switch (mood) {
      case "sleeping":
        setActivity("listening");
        void recorder.start();
        break;
      case "listening":
        recorder.stop();
        break;
      case "mail":
        // Later: show or print the comic here.
        clearMail();
        break;
      // Busy drawing or celebrating: taps do nothing.
    }
  }

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "m") toggleMail();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMail]);

  const asleep = mood === "sleeping";

  return (
    <button
      type="button"
      onClick={tap}
      aria-label={asleep ? "Tap to wake the robot" : "Tap the robot"}
      className="bg-background text-foreground fixed inset-0 flex cursor-pointer items-center justify-center focus-visible:outline-none"
    >
      <div key={mood} className="face-swap h-full w-full">
        <RobotFace mood={mood} className="h-full w-full" />
      </div>
      <span className="sr-only" aria-live="polite">
        {problem}
      </span>
    </button>
  );
}

/** Sends the recording to our server, which asks xAI for the words. */
async function transcribeRecording(audio: Blob): Promise<string> {
  const form = new FormData();
  form.append("audio", audio);
  const response = await postWithRetry("/api/transcribe", form);
  const data = (await response.json().catch(() => ({}))) as { text?: string; error?: string };
  if (!response.ok || typeof data.text !== "string") {
    throw new Error(data.error ?? `Transcription failed (${response.status})`);
  }
  return data.text;
}

/**
 * fetch() only throws when the request never got an answer (connection dropped,
 * page reloading, phone switching networks). Try once more before giving up.
 */
async function postWithRetry(url: string, body: FormData): Promise<Response> {
  try {
    return await fetch(url, { method: "POST", body });
  } catch (error) {
    log("upload didn't reach the server, retrying once", {
      error: String(error),
      page: location.origin,
      online: navigator.onLine,
    });
    await new Promise((resolve) => setTimeout(resolve, 800));
    return fetch(url, { method: "POST", body });
  }
}

/** Console logging for debugging, prefixed so it's easy to filter ("[face]"). */
function log(...args: unknown[]) {
  console.info("[face]", ...args);
}

/** Best effort: go fullscreen so browser bars don't cover the face. Not available on iPhone. */
function goFullscreen() {
  const root = document.documentElement;
  if (!document.fullscreenElement && root.requestFullscreen) {
    root.requestFullscreen().catch((error) => log("fullscreen not allowed", error.message));
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
          log("screen wake lock on");
        })
        .catch((error) => log("screen wake lock not allowed", error.message));
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
