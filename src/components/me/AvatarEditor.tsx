"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Segmented } from "@/components/Segmented";
import { AvatarBuilder } from "@/components/me/AvatarBuilder";
import { AvatarPortrait } from "@/components/me/AvatarFace";
import { MeKeyframes } from "@/components/me/AvatarStage";
import { PhotoAvatarMaker } from "@/components/me/PhotoAvatarMaker";
import { BrushIcon, CameraIcon } from "@/components/me/icons";
import {
  type Avatar,
  type AvatarAdapter,
  type AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  configsEqual,
  sameAvatar,
} from "@/features/avatar";

type Mode = "photo" | "build";

const MODES = [
  { value: "photo", label: "Use a photo", Icon: CameraIcon },
  { value: "build", label: "Build one", Icon: BrushIcon },
] as const;

type Props = {
  /** Whose avatar this is: where it loads from and saves to. */
  store: AvatarAdapter;
  title: string;
  subtitle: string;
  /** Read aloud for the saved portrait in the header. */
  portraitLabel: string;
};

/**
 * Make a comic character from a selfie or by building one. Used for both the
 * grown-up's avatar and the child's; `store` decides which one is edited.
 *
 * The header stays put; everything under it scrolls, and the tab bar from the
 * layout stays pinned below.
 */
export function AvatarEditor({ store, title, subtitle, portraitLabel }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState<Avatar | null>(null);
  const [mode, setMode] = useState<Mode>("photo");
  const [draft, setDraft] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    store
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
  }, [store]);

  async function save(avatar: Avatar) {
    setSaving(true);
    setProblem(null);
    try {
      await store.save(avatar);
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
          <Link
            href="/me"
            className="text-xs font-black tracking-[0.2em] text-orange-500 uppercase hover:text-orange-600 focus-visible:underline focus-visible:outline-none"
          >
            ‹ Settings
          </Link>
          <h1 className="text-[1.7rem] leading-tight font-black">{title}</h1>
          <p className="text-sm font-bold text-stone-500">{subtitle}</p>
        </div>
        {saved && (
          <span className="rounded-full shadow-[0_4px_10px_-2px_rgb(103_29_154/0.35)] ring-2 ring-white">
            <AvatarPortrait avatar={saved} size="sm" label={portraitLabel} />
          </span>
        )}
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4">
        <div className="mt-4 flex justify-center px-6">
          <Segmented
            label="How to make the avatar"
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
      </div>
    </div>
  );
}
