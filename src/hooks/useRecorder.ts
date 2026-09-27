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
  const requestRef = useRef(0);
  const openingRef = useRef(false);
  const urlRef = useRef<string | null>(null);
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
      requestRef.current += 1;
      clearTick();
      if (recorderRef.current) recorderRef.current.onstop = null;
      recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [clearTick]);

  const start = useCallback(async () => {
    if (openingRef.current || recorderRef.current?.state === "recording") return;
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
    openingRef.current = true;
    const requestId = ++requestRef.current;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      openingRef.current = false;
      if (requestId !== requestRef.current) return;
      setState("denied");
      return;
    }

    openingRef.current = false;
    if (requestId !== requestRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setState("unsupported");
      return;
    }
    recorderRef.current = recorder;
    const chunks: Blob[] = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onerror = () => {
      clearTick();
      recorder.onstop = null;
      stream.getTracks().forEach((track) => track.stop());
      if (requestId === requestRef.current) setState("unsupported");
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      if (requestId !== requestRef.current) return;
      setAudio(blob);
      urlRef.current = URL.createObjectURL(blob);
      setAudioUrl(urlRef.current);
      setState("recorded");
    };

    try {
      recorder.start();
    } catch {
      stream.getTracks().forEach((track) => track.stop());
      setState("unsupported");
      return;
    }
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
    requestRef.current += 1;
    openingRef.current = false;
    if (recorderRef.current) recorderRef.current.onstop = null;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
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
