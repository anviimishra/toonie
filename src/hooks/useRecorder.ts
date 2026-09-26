"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Microphone recording, wrapped so the record screen stays declarative.
 *
 * Permission is requested on the first press rather than page load, so nobody
 * gets a browser prompt before they have asked for anything.
 */

export type RecorderState =
  | "idle" // never recorded, or reset
  | "requesting" // waiting on the permission prompt
  | "recording"
  | "recorded" // we have audio
  | "denied" // permission refused
  | "unsupported"; // no MediaRecorder in this browser

export type Recorder = {
  state: RecorderState;
  /** Milliseconds captured in the current or last take. */
  elapsedMs: number;
  audio: Blob | null;
  /** Object URL for playback, revoked automatically. */
  audioUrl: string | null;
  start: () => Promise<void>;
  stop: () => void;
  reset: () => void;
};

function isSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.MediaRecorder !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

export function useRecorder(): Recorder {
  const [state, setState] = useState<RecorderState>("idle");
  const [elapsedMs, setElapsed] = useState(0);
  const [audio, setAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Release the stream and any object URL on unmount, so the browser stops
  // showing the recording indicator if someone navigates away mid-take.
  useEffect(() => {
    return () => {
      clearTick();
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      setAudioUrl((url) => {
        if (url) URL.revokeObjectURL(url);
        return null;
      });
    };
  }, [clearTick]);

  const start = useCallback(async () => {
    if (!isSupported()) {
      setState("unsupported");
      return;
    }

    setAudioUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setAudio(null);
    setElapsed(0);
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setState("denied");
      return;
    }

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
      setAudio(blob);
      setAudioUrl(URL.createObjectURL(blob));
      setState("recorded");
    };

    recorder.start();
    startedAtRef.current = Date.now();
    setState("recording");

    clearTick();
    tickRef.current = setInterval(() => {
      setElapsed(Date.now() - startedAtRef.current);
    }, 100);
  }, [clearTick]);

  const stop = useCallback(() => {
    clearTick();
    setElapsed(startedAtRef.current ? Date.now() - startedAtRef.current : 0);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    setAudioUrl((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setAudio(null);
    setElapsed(0);
    setState("idle");
  }, [clearTick]);

  return { state, elapsedMs, audio, audioUrl, start, stop, reset };
}
