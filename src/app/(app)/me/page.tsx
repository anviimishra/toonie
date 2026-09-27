"use client";

import { PairingSettings } from "@/components/me/PairingSettings";
import Link from "next/link";
import { Button } from "@/components/Button";
import { useEffect, useId, useState } from "react";
import { ChevronRightIcon, FaceIcon, LanguageIcon } from "@/components/icons";
import { AccountCard } from "@/components/me/AccountCard";
import { AvatarPortrait } from "@/components/me/AvatarFace";
import { type Avatar, avatars, childAvatars } from "@/features/avatar";
import { backfillAvatar, loadAvatar } from "@/features/family/avatars";
import {
  getFamily,
  setVoiceConsent,
  updateFamilyMember,
  uploadAvatar,
} from "@/features/family/client";
import { getPairs } from "@/features/messages/client";
import {
  DEFAULT_LANGUAGE,
  DEFAULT_SETTINGS,
  LANGUAGES,
  isLanguage,
  type LanguageCode,
  type Settings,
  settings as settingsStore,
} from "@/features/settings";
import type { ParentChildPair } from "@/lib/supabase/types";

/**
 * Settings: both avatars (yours and your child's), both languages, the
 * connected child tablet, and who is signed in. Anything the other tablet needs
 * is saved to Supabase once a child device is connected.
 *
 * The header stays put; everything under it scrolls, and the tab bar from the
 * layout stays pinned below.
 */
export default function SettingsPage() {
  const [mine, setMine] = useState<Avatar | null>(null);
  const [child, setChild] = useState<Avatar | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // Shared copies from Supabase, for each connected child tablet.
      const pairs = await getPairs().catch(() => [] as ParentChildPair[]);
      const families = await Promise.all(pairs.map((p) => getFamily(p.id).catch(() => null)));
      const first = families[0] ?? null;

      // Show this tablet's avatars, or fill them in from Supabase.
      const [me, kid] = await Promise.all([
        loadAvatar(avatars, async () => first?.parent ?? null),
        loadAvatar(childAvatars, async () => first?.child ?? null),
      ]);
      if (!active) return;
      setMine(me);
      setChild(kid);

      // Upload any avatar made here before pairing, so the other tablet gets it.
      await Promise.all(
        pairs.flatMap((pair, i) => [
          backfillAvatar(me, families[i]?.parent ?? null, (a) =>
            uploadAvatar(pair.id, "parent", a),
          ),
          backfillAvatar(kid, families[i]?.child ?? null, (a) => uploadAvatar(pair.id, "child", a)),
        ]),
      ).catch((error) => console.warn("[settings] couldn't upload an avatar", error));
    })();
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

        <Section title="Read-aloud voice">
          <VoiceSettings />
        </Section>

        <PairingSettings />
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
 * The grown-up's and the child's languages. Once a child tablet is connected
 * they're saved to Supabase (family_members) so both tablets agree; before
 * that they're kept on this tablet. Preferences only for now: stories are
 * transcribed in English and nothing is translated yet.
 */
function LanguageSettings() {
  const [pairs, setPairs] = useState<ParentChildPair[] | null>(null);
  const [parentLanguage, setParentLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [childLanguages, setChildLanguages] = useState<Record<string, LanguageCode>>({});
  const [local, setLocal] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<"loading" | "idle" | "saved" | "error">("loading");

  useEffect(() => {
    let active = true;
    (async () => {
      const [found, saved] = await Promise.all([
        getPairs().catch(() => [] as ParentChildPair[]),
        settingsStore.get(),
      ]);
      const families = await Promise.all(found.map((p) => getFamily(p.id).catch(() => null)));
      if (!active) return;
      setLocal(saved);
      setPairs(found);
      const asCode = (value: string | undefined, fallback: LanguageCode) =>
        isLanguage(value) ? value : fallback;
      setParentLanguage(asCode(families[0]?.parent?.language, saved.parentLanguage));
      setChildLanguages(
        Object.fromEntries(
          found.map((p, i) => [p.id, asCode(families[i]?.child?.language, saved.childLanguage)]),
        ),
      );
      setStatus("idle");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function save(task: () => Promise<unknown>) {
    try {
      await task();
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  }

  const connected = (pairs?.length ?? 0) > 0;
  const loading = status === "loading";

  function changeParent(code: LanguageCode) {
    setParentLanguage(code);
    void save(async () => {
      await settingsStore.save({ ...local, parentLanguage: code });
      setLocal((l) => ({ ...l, parentLanguage: code }));
      await Promise.all(
        (pairs ?? []).map((p) => updateFamilyMember(p.id, "parent", { language: code })),
      );
    });
  }

  function changeChild(pairId: string | null, code: LanguageCode) {
    if (pairId) {
      setChildLanguages((all) => ({ ...all, [pairId]: code }));
      void save(() => updateFamilyMember(pairId, "child", { language: code }));
    } else {
      setLocal((l) => ({ ...l, childLanguage: code }));
      void save(() => settingsStore.save({ ...local, childLanguage: code }));
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-600">
          <LanguageIcon className="size-6" />
        </span>
        <p className="pt-1 text-sm font-bold text-stone-500">
          {connected
            ? "Shared with the connected tablet, so you each see your own language."
            : "Saved on this tablet. Connect a child device below to share them."}
        </p>
      </div>

      <div className="mt-4 space-y-3">
        <LanguageSelect
          label="Your language"
          value={parentLanguage}
          disabled={loading}
          onChange={changeParent}
        />
        {connected ? (
          pairs!.map((pair) => (
            <LanguageSelect
              key={pair.id}
              label={`${pair.child_name}'s language`}
              value={childLanguages[pair.id] ?? DEFAULT_LANGUAGE}
              disabled={loading}
              onChange={(code) => changeChild(pair.id, code)}
            />
          ))
        ) : (
          <LanguageSelect
            label="Child's language"
            value={local.childLanguage}
            disabled={loading}
            onChange={(code) => changeChild(null, code)}
          />
        )}
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

/**
 * The parent's opt-in for read-alouds in their own voice. Stories they send
 * are translated into the child's language and, only if this is on, spoken in
 * a copy of their voice made from their story recordings. Off by default;
 * turning it off deletes the copy and everything spoken with it.
 */
function VoiceSettings() {
  const [state, setState] = useState<"loading" | "unpaired" | "off" | "on">("loading");
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [pair] = await getPairs().catch(() => [] as ParentChildPair[]);
      if (!pair) return active && setState("unpaired");
      const family = await getFamily(pair.id).catch(() => null);
      if (active) setState(family?.parent?.voice_consent_at ? "on" : "off");
    })();
    return () => {
      active = false;
    };
  }, []);

  async function change(consent: boolean) {
    setBusy(true);
    setProblem(null);
    try {
      await setVoiceConsent(consent);
      setState(consent ? "on" : "off");
      setAgreed(false);
    } catch (e) {
      setProblem(e instanceof Error ? e.message : "That didn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <div className="h-24 p-4" aria-busy="true" />;

  return (
    <div className="space-y-3 p-4 text-sm font-bold text-stone-600">
      <p>
        Your stories are translated into your child&apos;s language and read aloud on their tablet.
        If you turn this on, they&apos;re read in{" "}
        <span className="text-stone-800">your own voice</span>: Toonie makes a copy of your voice
        with ElevenLabs from your story recordings.
      </p>

      {state === "unpaired" && <p>Connect a child device below to use this.</p>}

      {state === "on" && (
        <>
          <p className="text-orange-600">On: stories are read in your voice.</p>
          <Button
            variant="secondary"
            className="w-full"
            disabled={busy}
            onClick={() => change(false)}
          >
            {busy ? "Turning off…" : "Turn off and delete my voice copy"}
          </Button>
        </>
      )}

      {state === "off" && (
        <>
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 size-5 accent-orange-500"
            />
            <span>
              This is my voice, and I agree to Toonie making a copy of it to read my stories to my
              child. I can turn this off at any time, which deletes the copy.
            </span>
          </label>
          <Button className="w-full" disabled={!agreed || busy} onClick={() => change(true)}>
            {busy ? "Turning on…" : "Read my stories in my voice"}
          </Button>
        </>
      )}

      {problem && (
        <p role="alert" className="text-red-600">
          {problem}
        </p>
      )}
    </div>
  );
}
