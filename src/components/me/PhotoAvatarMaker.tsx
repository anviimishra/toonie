"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/Button";
import { SparkleIcon } from "@/components/icons";
import { type Avatar, type AvatarConfig, avatars, checkPhoto } from "@/features/avatar";
import { AvatarPortrait } from "./AvatarFace";
import { AvatarStage } from "./AvatarStage";
import { GeneratingAvatar } from "./GeneratingAvatar";
import { CameraIcon, CheckIcon, PencilIcon, ShieldIcon } from "./icons";

type Props = {
  /** A saved photo avatar to start from, if there is one. */
  initial: Avatar | null;
  /** True when `avatar` is already the saved one. */
  isSaved: (avatar: Avatar) => boolean;
  onSave: (avatar: Avatar) => void;
  /** Open the builder with this look, to adjust it by hand. */
  onTweak: (config: AvatarConfig) => void;
  saving: boolean;
};

type Phase = "idle" | "generating" | "done";

/** The Button primary look, for the label that opens the camera. */
const PICK_PRIMARY = [
  "bg-linear-to-b from-orange-400 to-orange-600 text-white shadow-raised",
  "hover:brightness-105 active:translate-y-0.5 active:shadow-raised-pressed",
].join(" ");
const PICK_SECONDARY =
  "bg-white text-foreground shadow-chip hover:bg-stone-50 active:translate-y-0.5 active:shadow-none";

/**
 * Selfie to avatar: take (or pick) a photo, see it, tap "Make my avatar",
 * watch it being drawn, then keep it or tweak it.
 */
export function PhotoAvatarMaker({ initial, isSaved, onSave, onTweak, saving }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>(initial ? "done" : "idle");
  const [result, setResult] = useState<Avatar | null>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  // Bumped on every new photo, so a slow answer for an old photo is ignored.
  const request = useRef(0);

  // Object URLs hold the photo in memory until revoked.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const picked = event.target.files?.[0];
    // Clear it so choosing the same photo again still fires a change.
    event.target.value = "";
    if (!picked) return;
    const check = checkPhoto(picked);
    if (!check.ok) {
      setProblem(check.reason);
      return;
    }
    request.current += 1;
    setProblem(null);
    setResult(null);
    setPhase("idle");
    setFile(picked);
  }

  async function generate() {
    if (!file) return;
    const mine = ++request.current;
    setProblem(null);
    setPhase("generating");
    try {
      const avatar = await avatars.generateFromPhoto(file);
      if (mine !== request.current) return;
      setResult(avatar);
      setPhase("done");
    } catch {
      if (mine !== request.current) return;
      setProblem("Our pencils slipped. Try again!");
      setPhase("idle");
    }
  }

  const shownPhoto = photoUrl ?? result?.photoDataUrl ?? null;
  const saved = result !== null && isSaved(result);

  const pickLabel = (primary: boolean, text: string, compact = false) => (
    <label
      className={[
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full py-3.5 font-extrabold",
        compact ? "px-3 text-base" : "px-6 text-lg",
        "transition-[transform,box-shadow,filter] duration-150",
        "has-[input:focus-visible]:ring-4 has-[input:focus-visible]:ring-orange-300/60",
        primary ? PICK_PRIMARY : PICK_SECONDARY,
        "w-full",
      ].join(" ")}
    >
      <CameraIcon className="size-5" />
      {text}
      <input type="file" accept="image/*" capture="user" onChange={pick} className="sr-only" />
    </label>
  );

  return (
    <>
      {phase === "generating" ? (
        <GeneratingAvatar photoUrl={shownPhoto} />
      ) : phase === "done" && result ? (
        <AvatarStage
          below={<p className="text-sm font-bold text-stone-500">Ta-da! Here&apos;s you.</p>}
          badge={
            shownPhoto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownPhoto}
                alt="The photo it was drawn from"
                className="absolute bottom-1 left-1 size-16 rounded-full object-cover shadow-card ring-4 ring-white"
              />
            )
          }
        >
          <AvatarPortrait avatar={result} size="fill" label="Your new avatar" className="me-pop" />
        </AvatarStage>
      ) : (
        <AvatarStage
          below={
            <p className="text-sm font-bold text-stone-500">
              {shownPhoto ? "Nice one! Ready when you are." : "Big smile!"}
            </p>
          }
        >
          {shownPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shownPhoto} alt="Your selfie" className="me-pop size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center rounded-full border-4 border-dashed border-orange-200 bg-orange-50 text-orange-400">
              <CameraIcon className="size-14" />
            </span>
          )}
        </AvatarStage>
      )}

      <div className="mx-3 mt-4 flex flex-col gap-3 rounded-[28px] bg-white/90 p-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
        {phase === "done" && result ? (
          <>
            <Button onClick={() => onSave(result)} disabled={saving || saved} className="w-full">
              {saved ? (
                <CheckIcon className="size-5" strokeWidth={3} />
              ) : (
                <SparkleIcon className="size-5" />
              )}
              {saved ? "Saved!" : saving ? "Saving…" : "Use this avatar"}
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => onTweak(result.config)}
                className="px-3 text-base"
              >
                <PencilIcon className="size-5" />
                Tweak it
              </Button>
              {pickLabel(false, "New photo", true)}
            </div>
          </>
        ) : file ? (
          <>
            <Button onClick={generate} disabled={phase === "generating"} className="w-full">
              <SparkleIcon className="size-5" />
              {phase === "generating" ? "Drawing…" : "Make my avatar"}
            </Button>
            {phase !== "generating" && pickLabel(false, "Retake")}
          </>
        ) : (
          pickLabel(true, "Take a selfie")
        )}

        {problem && (
          <p role="alert" className="text-center text-sm font-bold text-red-600">
            {problem}
          </p>
        )}

        <p className="flex items-start gap-2 text-xs leading-snug font-bold text-stone-500">
          <ShieldIcon className="mt-px size-4 shrink-0 text-emerald-500" />
          Your photo is only used to draw your avatar.
        </p>
      </div>
    </>
  );
}
