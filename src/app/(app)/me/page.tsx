"use client";

import { useEffect, useState } from "react";
import { Segmented } from "@/components/Segmented";
import { AccountCard } from "@/components/me/AccountCard";
import { AvatarBuilder } from "@/components/me/AvatarBuilder";
import { AvatarPortrait } from "@/components/me/AvatarFace";
import { MeKeyframes } from "@/components/me/AvatarStage";
import { PhotoAvatarMaker } from "@/components/me/PhotoAvatarMaker";
import { BrushIcon, CameraIcon } from "@/components/me/icons";
import {
  type Avatar,
  type AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  avatars,
  configsEqual,
  sameAvatar,
} from "@/features/avatar";

type Mode = "photo" | "build";

const MODES = [
  { value: "photo", label: "Use a photo", Icon: CameraIcon },
  { value: "build", label: "Build one", Icon: BrushIcon },
] as const;

/**
 * The Me screen: make the character that stars in every panel of your
 * comics, from a selfie or by building one, and see who is signed in.
 *
 * The header stays put; everything under it scrolls, and the tab bar from the
 * layout stays pinned below.
 */
export default function MePage() {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<Avatar | null>(null);
  const [mode, setMode] = useState<Mode>("photo");
  const [draft, setDraft] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    avatars
      .get()
      .catch(() => null)
      .then((found) => {
        if (!active) return;
        setSaved(found);
        if (found) {
          setDraft(found.config);
          setMode(found.source === "photo" ? "photo" : "build");
        }
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function save(avatar: Avatar) {
    setSaving(true);
    setProblem(null);
    try {
      await avatars.save(avatar);
      setSaved(avatar);
    } catch {
      setProblem("That didn't save. Try again in a moment.");
    } finally {
      setSaving(false);
    }
  }

  const builtSaved =
    saved !== null && saved.source === "preset" && configsEqual(saved.config, draft);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <MeKeyframes />

      <header className="flex items-center justify-between gap-4 px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-orange-500 uppercase">Toonie</p>
          <h1 className="text-[1.7rem] leading-tight font-black">Your avatar</h1>
          <p className="text-sm font-bold text-stone-500">The star of every comic you make.</p>
        </div>
        {saved && (
          <span className="rounded-full shadow-[0_4px_10px_-2px_rgb(154_52_18/0.35)] ring-2 ring-white">
            <AvatarPortrait avatar={saved} size="sm" label="Your saved avatar" />
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        <div className="mt-4 flex justify-center px-6">
          <Segmented
            label="How to make your avatar"
            options={MODES}
            value={mode}
            onChange={(next) => {
              setMode(next);
              setProblem(null);
            }}
          />
        </div>

        {problem && (
          <p role="alert" className="mt-3 px-6 text-center text-sm font-bold text-red-600">
            {problem}
          </p>
        )}

        <div className="mt-4">
          {!loaded ? (
            <div aria-hidden="true" className="flex justify-center py-4">
              <span className="size-44 animate-pulse rounded-full bg-white/70 shadow-card motion-reduce:animate-none" />
            </div>
          ) : (
            <>
              {/* Both stay mounted so switching modes never loses a photo or a
                  half-built look; the other one is just hidden. */}
              <div hidden={mode !== "photo"}>
                <PhotoAvatarMaker
                  initial={saved?.source === "photo" ? saved : null}
                  isSaved={(avatar) => saved !== null && sameAvatar(saved, avatar)}
                  onSave={save}
                  onTweak={(config) => {
                    setDraft(config);
                    setMode("build");
                  }}
                  saving={saving}
                />
              </div>
              <div hidden={mode !== "build"}>
                <AvatarBuilder
                  config={draft}
                  onChange={setDraft}
                  onSave={() => save({ source: "preset", config: draft })}
                  saving={saving}
                  saved={builtSaved}
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-4">
          <AccountCard avatar={saved} />
        </div>
      </div>
    </div>
  );
}
