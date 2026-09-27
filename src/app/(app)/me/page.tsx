"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { ChevronRightIcon, FaceIcon, LanguageIcon } from "@/components/icons";
import { AccountCard } from "@/components/me/AccountCard";
import { AvatarPortrait } from "@/components/me/AvatarFace";
import { type Avatar, avatars, childAvatars } from "@/features/avatar";
import {
  DEFAULT_SETTINGS,
  LANGUAGES,
  type LanguageCode,
  type Settings,
  settings as settingsStore,
} from "@/features/settings";

/**
 * Settings: both avatars (yours and your child's), your default languages,
 * and who is signed in.
 *
 * The header stays put; everything under it scrolls, and the tab bar from the
 * layout stays pinned below.
 */
export default function SettingsPage() {
  const [mine, setMine] = useState<Avatar | null>(null);
  const [child, setChild] = useState<Avatar | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([avatars.get().catch(() => null), childAvatars.get().catch(() => null)]).then(
      ([me, kid]) => {
        if (!active) return;
        setMine(me);
        setChild(kid);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <p className="text-xs font-black tracking-[0.2em] text-orange-500 uppercase">Toonie</p>
        <h1 className="text-[1.7rem] leading-tight font-black">Settings</h1>
      </header>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-3 pt-4 pb-4">
        <Section title="Avatars">
          <ul className="divide-y divide-orange-100/80">
            <AvatarRow
              href="/me/avatar"
              title="My avatar"
              hint="You, in every comic"
              avatar={mine}
            />
            <AvatarRow
              href="/me/child-avatar"
              title="Child's avatar"
              hint="Your kid, in the comics"
              avatar={child}
            />
          </ul>
        </Section>

        <Section title="Language">
          <LanguageSettings />
        </Section>

        <AccountCard avatar={mine} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title}>
      <h2 className="mb-2 px-3 text-xs font-black tracking-[0.2em] text-stone-500 uppercase">
        {title}
      </h2>
      <div className="rounded-[28px] bg-white/90 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
        {children}
      </div>
    </section>
  );
}

function AvatarRow({
  href,
  title,
  hint,
  avatar,
}: {
  href: string;
  title: string;
  hint: string;
  avatar: Avatar | null;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center gap-3 rounded-[28px] p-3 pl-4 transition-colors hover:bg-orange-50/70 focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none"
      >
        {avatar ? (
          <span className="rounded-full ring-2 ring-white">
            <AvatarPortrait avatar={avatar} size="sm" />
          </span>
        ) : (
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-linear-to-b from-amber-200 to-orange-300 text-orange-900 ring-2 ring-white">
            <FaceIcon className="size-6" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block font-black text-stone-800">{title}</span>
          <span className="block text-sm font-bold text-stone-400">
            {avatar ? hint : "Not made yet — tap to create"}
          </span>
        </span>
        <ChevronRightIcon className="size-5 text-stone-400" />
      </Link>
    </li>
  );
}

/**
 * Default languages for sending stories and receiving comics. Saves on change.
 * Preferences only for now: stories are transcribed in English and nothing is
 * translated yet.
 */
function LanguageSettings() {
  const [value, setValue] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"loading" | "idle" | "saved" | "error">("loading");

  useEffect(() => {
    let active = true;
    settingsStore.get().then((found) => {
      if (!active) return;
      setValue(found);
      setStatus("idle");
    });
    return () => {
      active = false;
    };
  }, []);

  async function change(patch: Partial<Settings>) {
    const next = { ...value, ...patch };
    setValue(next);
    try {
      await settingsStore.save(next);
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600">
          <LanguageIcon className="size-6" />
        </span>
        <p className="pt-1 text-sm font-bold text-stone-500">
          Pick the language you tell stories in, and the one you want comics to arrive in.
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <LanguageSelect
          label="I send stories in"
          value={value.sendLanguage}
          disabled={status === "loading"}
          onChange={(sendLanguage) => change({ sendLanguage })}
        />
        <LanguageSelect
          label="I receive comics in"
          value={value.receiveLanguage}
          disabled={status === "loading"}
          onChange={(receiveLanguage) => change({ receiveLanguage })}
        />
      </div>

      <p aria-live="polite" className="mt-3 h-5 text-center text-sm font-extrabold">
        {status === "saved" && <span className="text-orange-600">Saved ✓</span>}
        {status === "error" && (
          <span className="text-red-600">That didn&apos;t save. Try again.</span>
        )}
      </p>
    </div>
  );
}

function LanguageSelect({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: LanguageCode;
  disabled: boolean;
  onChange: (code: LanguageCode) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3">
      <label htmlFor={id} className="font-black text-stone-800">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as LanguageCode)}
        className="max-w-[55%] rounded-full bg-orange-50 px-4 py-2 font-extrabold text-orange-900 ring-1 ring-orange-200 focus-visible:ring-4 focus-visible:ring-orange-300/60 focus-visible:outline-none disabled:opacity-50"
      >
        {LANGUAGES.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </div>
  );
}
