"use client";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { FaceIcon, KeyboardIcon, MicIcon, SparkleIcon } from "@/components/icons";
import { PanelCountPicker } from "@/components/PanelCountPicker";
import { RecordButton } from "@/components/RecordButton";
import { Segmented } from "@/components/Segmented";
import { useCurrentUser } from "@/features/auth";
import {
  PANEL_COUNT_DEFAULT,
  type DraftMode,
  type StoryDraft,
  checkDraft,
} from "@/features/stories";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadInput, saveInput, clearDraft, loadDraft, saveDraft } from "@/features/stories/storage";
import { useComicJob, jobSource } from "@/features/stories/useComicJob";
import { deliverStory, getPairs } from "@/features/messages/client";
import type { ParentChildPair } from "@/lib/supabase/types";
import { avatars } from "@/features/avatar";
import { parentLanguage } from "@/features/family/client";
import { avatarReference, describeAvatar } from "@/features/avatar/reference";
import { StickerComic } from "@/components/feed/StickerComic";
import { StoryAudio } from "@/components/StoryAudio";
import {
  audioExtension,
  textSource,
  legacySource,
  prepareStory,
  type PreparedStory,
  type StorySource,
} from "@/features/stories/submission";
import { downloadSticker, renderSticker } from "@/features/stories/export-sticker";
import { ComicPanel } from "@/components/feed/ComicPanel";
import type { Comic } from "@/types";
import { useRecorder } from "@/hooks/useRecorder";
const MODES = [
  { value: "talk", label: "Talk", Icon: MicIcon },
  { value: "type", label: "Type", Icon: KeyboardIcon },
] as const;
/**
 * The home screen is the record screen. Telling a story is the whole app, so
 * it is the first thing you see rather than something behind a menu.
 *
 * Laid out to fit a phone without scrolling: header, the button filling the
 * middle, and a raised card at the bottom holding everything you do last.
 */
export default function RecordPage() {
  const { user } = useCurrentUser();
  const recorder = useRecorder();
  const router = useRouter();
  const generation = useComicJob();
  const restoredJob = useRef<string | null>(null);
  const [source, setSource] = useState<StorySource>(textSource);
  const [comicSource, setComicSource] = useState<StorySource>(legacySource);
  const [pairs, setPairs] = useState<ParentChildPair[]>([]);
  const [pairId, setPairId] = useState("");
  useEffect(() => {
    let active = true;
    getPairs()
      .then((items) => {
        if (active) {
          setPairs(items);
          setPairId(items[0]?.id ?? "");
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const [comicId, setComicId] = useState("");
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const preparedStory = useRef<PreparedStory | undefined>(undefined);
  const [restoring, setRestoring] = useState(true);
  const [mode, setMode] = useState<DraftMode>("talk");
  const [text, setText] = useState("");
  const [panelCount, setPanelCount] = useState(PANEL_COUNT_DEFAULT);
  const [sending, setSending] = useState(false);
  const [printPreview, setPrintPreview] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [comic, setComic] = useState<Comic | null>(null);
  const [needsAvatar, setNeedsAvatar] = useState(false);
  const active = useRef(false);
  useEffect(() => {
    const job = generation.job;
    if (job?.status === "failed" && restoredJob.current !== job.id) {
      restoredJob.current = job.id;
      setProblem(job.error ?? "Please try again.");
    }
    if (!job?.comic || job.status !== "ready" || restoredJob.current === job.id) return;
    let mounted = true;
    void jobSource(job)
      .then(async (savedSource) => {
        const existing = await loadDraft().catch(() => undefined);
        if (!mounted) return;
        restoredJob.current = job.id;
        setComic(job.comic!);
        setComicId(job.id);
        setComicSource(savedSource);
        setSource(savedSource);
        setText(job.comic!.transcript);
        setMode(savedSource.audio ? "talk" : "type");
        setPanelCount(job.comic!.stickerPanels?.length ?? Math.min(4, job.comic!.panels.length));
        preparedStory.current = existing?.id === job.id ? existing.submission : undefined;
        await saveDraft({
          id: job.id,
          comic: job.comic!,
          source: savedSource,
          submission: preparedStory.current,
        });
      })
      .catch((e) => {
        if (mounted) setProblem(e.message);
      });
    return () => {
      mounted = false;
    };
  }, [generation.job]);
  useEffect(() => {
    let mounted = true;
    Promise.all([loadDraft(), loadInput()])
      .then(([draft, input]) => {
        if (mounted && !draft && input) {
          setText(input.text);
          setSource(input.source);
          setMode(input.source.audio ? "talk" : "type");
        }
        if (mounted && draft) {
          setComic(draft.comic);
          setSource(draft.source ?? legacySource());
          setComicSource(draft.source ?? legacySource());
          setComicId(draft.id);
          preparedStory.current = draft.submission;
          setText(draft.comic.transcript);
          setMode(draft.source?.audio ? "talk" : "type");
          setPanelCount(
            draft.comic.stickerPanels?.length ?? Math.min(4, draft.comic.panels.length),
          );
        }
      })
      .catch(() => {
        if (mounted) setProblem("Saved previews are unavailable in this browser.");
      })
      .finally(() => {
        if (mounted) setRestoring(false);
      });
    return () => {
      mounted = false;
    };
  }, []);
  const [problem, setProblem] = useState<string | null>(null);
  const storyAudio = recorder.audio ?? source.audio;
  const recordedMs = recorder.audio ? recorder.elapsedMs : (source.durationMs ?? 0);
  const draft: StoryDraft = { mode, audio: storyAudio, text, panelCount };
  const hasSomething = mode === "talk" ? storyAudio !== null : text.trim().length > 0;

  async function exportSticker() {
    if (!comic || downloading) return;
    setDownloading(true);
    setProblem(null);
    try {
      await downloadSticker(comic.stickerPanels ?? comic.panels, comic.title, true);
    } catch {
      setProblem("Couldn't download the sticker. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  async function send() {
    const check = checkDraft(draft, recordedMs);
    if (!check.ok) {
      setProblem(check.reason);
      return;
    }
    if (active.current || generation.job?.status === "working") return;
    setProblem(null);
    setNeedsAvatar(false);
    setSending(true);
    active.current = true;
    const sentSource: StorySource =
      mode === "talk"
        ? { kind: "voice", audio: storyAudio, durationMs: recordedMs, originalTranscript: null }
        : textSource();
    try {
      // Save the original recording before generation, so retries and refreshes retain it.
      await saveInput({ text: mode === "talk" ? "" : text, source: sentSource });
      setSource(sentSource);
      const avatar = await avatars.get();
      if (!avatar) {
        setNeedsAvatar(true);
        throw new Error("Create and save your avatar in Me first, so your comic stars you.");
      }
      const form = new FormData();
      form.set("panelCount", String(panelCount));
      // Transcribe in the language set in Settings (no translation).
      form.set("language", await parentLanguage());
      form.set("reference", await avatarReference(avatar));
      // Photo references determine identity; default preset config must not override them.
      form.set(
        "narrator",
        avatar.imageUrl
          ? "The narrator is the exact character in the supplied reference image."
          : describeAvatar(avatar),
      );
      if (mode === "talk" && storyAudio)
        form.set("audio", storyAudio, `story.${audioExtension(storyAudio.type)}`);
      else form.set("text", text);
      form.set("durationMs", String(recordedMs));
      if (generation.job) await generation.dismiss();
      await generation.start(form);
    } catch (error) {
      setProblem(
        error instanceof Error ? error.message : "Couldn't make your comic. Please try again.",
      );
    } finally {
      active.current = false;
      setSending(false);
    }
  }
  async function approve() {
    if (!comic || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setProblem(null);
    try {
      const submission =
        preparedStory.current ??
        (comic.format === "sticker"
          ? await prepareStory(comicId, comic, comicSource, renderSticker)
          : undefined);
      if (!submission) throw new Error("Please generate a new sticker to send.");
      preparedStory.current = submission;
      if (!pairId) throw new Error("Connect a child device in Settings first.");
      await saveDraft({ id: comicId, comic, source: comicSource, submission });
      await deliverStory(submission, pairId);
      await generation.dismiss();
      await clearDraft().catch(() => {});
      router.push(`/feed/${comicId}`);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't save to your feed.");
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  function startOver() {
    void generation.dismiss().catch((e) => setProblem(e.message));
    preparedStory.current = undefined;
    void clearDraft().catch(() => setProblem("Couldn't clear the saved preview."));
    recorder.reset();
    setSource(textSource());
    setComicSource(legacySource());
    setText("");
    setComic(null);
    setProblem(null);
  }
  if (restoring || generation.loading)
    return (
      <p role="status" className="p-8">
        Opening your studio…
      </p>
    );
  if (sending || generation.job?.status === "working") {
    return (
      <section
        aria-busy="true"
        className="flex flex-1 flex-col items-center justify-center gap-6 px-8 text-center"
      >
        <span
          aria-hidden="true"
          className="size-12 animate-spin rounded-full border-4 border-stone-200 border-t-orange-600 motion-reduce:animate-none"
        />
        <div role="status" aria-live="polite">
          <h1 className="text-3xl font-black">Making your comic</h1>
          <p className="mt-3 text-lg">{generation.job?.stage ?? "Saving your story…"}</p>
          <p className="mt-2 text-sm text-stone-600">
            {generation.job?.drawn ?? 0} of {generation.job?.panel_count ?? panelCount} panels drawn
          </p>
        </div>
        <p className="text-sm text-stone-600">
          You can leave this page once your story is saved. Come back to review it before sending.
        </p>
        {!sending && (
          <Link href="/feed" className="font-bold underline">
            Browse my comics
          </Link>
        )}
        {generation.error && <p role="alert">{generation.error}</p>}
      </section>
    );
  }
  if (comic) {
    return (
      <section className="flex-1 overflow-y-auto px-5 py-6">
        <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
          Comic preview · Not sent
        </p>
        <h1 className="mt-2 text-3xl font-black">{comic.title}</h1>
        <p className="mt-2 text-stone-600">Here’s your story, starring your avatar.</p>
        <div className="my-6 space-y-4">
          {comic.format === "sticker" ? (
            <>
              {comic.readingVersion && !printPreview ? (
                comic.panels.map((panel, index) => (
                  <ComicPanel key={index} {...panel} number={index + 1} />
                ))
              ) : (
                <StickerComic
                  panels={comic.stickerPanels ?? comic.panels}
                  title={comic.title}
                  monochrome={printPreview}
                />
              )}
              <label className="flex items-center justify-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={printPreview}
                  onChange={(event) => setPrintPreview(event.target.checked)}
                />
                Black-and-white print preview
              </label>
              <p className="text-center text-sm text-stone-600">
                One 2″ × 2″ sticker · {(comic.stickerPanels ?? comic.panels).length} panels · no
                printed words
              </p>
            </>
          ) : (
            comic.panels.map((panel, index) => (
              <ComicPanel key={index} {...panel} number={index + 1} />
            ))
          )}
        </div>
        {comic.format === "sticker" && (
          <button
            onClick={exportSticker}
            disabled={downloading}
            className="mb-5 w-full py-3 font-bold underline"
          >
            {downloading ? "Preparing…" : "Download black-and-white print PNG"}
          </button>
        )}
        {comicSource.audio && <StoryAudio audio={comicSource.audio} />}
        <details className="mb-6 text-sm">
          <summary className="cursor-pointer font-bold">Your original story</summary>
          <p className="mt-2 whitespace-pre-wrap">{comic.transcript}</p>
        </details>
        {problem && (
          <p role="alert" className="mb-3 text-red-600">
            {problem}
          </p>
        )}
        <p className="mb-4 text-sm text-stone-600">
          Send delivers this comic and its story to your connected child.
        </p>
        {needsAvatar && (
          <Link href="/me" className="mt-3 block text-center font-bold underline">
            Create my avatar
          </Link>
        )}
        {pairs.length ? (
          <label className="mb-4 block font-bold">
            Send to
            <select
              value={pairId}
              disabled={saving}
              onChange={(e) => setPairId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-stone-300 p-3"
            >
              {pairs.map((pair) => (
                <option key={pair.id} value={pair.id}>
                  {pair.child_name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <Link href="/me" className="mb-4 block font-bold underline">
            Connect a child in Settings
          </Link>
        )}
        <Button onClick={approve} disabled={saving || !pairId} className="w-full">
          {saving ? "Saving…" : "Send to child"}
        </Button>
        <button onClick={send} disabled={saving} className="mt-4 w-full py-3 font-bold">
          Draw again
        </button>
        <button
          onClick={() => {
            setComic(null);
            setProblem(null);
          }}
          disabled={saving}
          className="mt-4 w-full py-3 font-bold"
        >
          {comicSource.kind === "voice" ? "Review recording" : "Edit story"}
        </button>
        <button onClick={startOver} disabled={saving} className="w-full py-3 text-stone-600">
          Tell a new story
        </button>
      </section>
    );
  }
  const initial = user?.displayName?.charAt(0).toUpperCase();
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(generation.error || generation.job?.status === "failed") && (
        <p role="alert" className="mx-5 mt-4 text-red-700">
          {generation.error || generation.job?.error} Your story is kept here; try making it again.
        </p>
      )}
      <header className="flex items-center justify-between px-6 pt-[max(env(safe-area-inset-top),1.25rem)]">
        <div>
          <p className="text-xs font-black tracking-[0.2em] text-orange-500 uppercase">Toonie</p>
          <h1 className="text-[1.7rem] leading-tight font-black">
            {user ? `Hi ${user.displayName}!` : "What happened today?"}
          </h1>
        </div>
        <span
          aria-label={user ? `Signed in as ${user.displayName}` : "Not signed in"}
          className="grid size-11 place-items-center rounded-full bg-linear-to-b from-amber-200 to-orange-300 text-lg font-black text-orange-900 shadow-[0_4px_10px_-2px_rgb(103_29_154/0.35),inset_0_1px_0_rgb(255_255_255/0.6)] ring-2 ring-white"
        >
          {initial ?? <FaceIcon className="size-6" />}
        </span>
      </header>
      <div className="mt-4 flex justify-center px-6">
        <Segmented
          label="How to tell your story"
          options={MODES}
          value={mode}
          onChange={(next) => {
            if (next === "type" && recorder.state === "recording") recorder.stop();
            if (next === "type" && recorder.state === "requesting") recorder.reset();
            setMode(next);
            setProblem(null);
          }}
        />
      </div>
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-3 [container-type:size]">
        {mode === "talk" ? (
          <>
            <RecordButton
              state={recorder.state}
              elapsedMs={recorder.elapsedMs}
              onStart={() => {
                setSource(textSource());
                return recorder.start();
              }}
              onStop={recorder.stop}
            />
            {!recorder.audioUrl && source.audio && <StoryAudio audio={source.audio} />}
            {recorder.audioUrl && (
              <audio
                controls
                src={recorder.audioUrl}
                aria-label="Listen back to your story"
                className="mt-1 h-10 w-full max-w-xs"
              />
            )}
          </>
        ) : (
          <label className="flex h-full max-h-80 w-full flex-col">
            <span className="mb-2 text-sm font-bold text-stone-600">
              Your story — edit anything before drawing
            </span>
            <textarea
              aria-label="Your story"
              maxLength={4000}
              value={text}
              onChange={(event) => {
                setText(event.target.value);
                setProblem(null);
              }}
              placeholder="Today I found a very round rock and named it Kevin…"
              className="h-full w-full resize-none rounded-3xl bg-white/90 p-5 text-lg leading-relaxed shadow-[inset_0_2px_6px_rgb(83_25_123/0.12),0_1px_0_rgb(255_255_255)] ring-1 ring-orange-100 placeholder:text-stone-400 focus:ring-4 focus:ring-orange-300/50 focus:outline-none"
            />
          </label>
        )}
      </section>
      <div className="mx-3 mb-3 rounded-[28px] bg-white/90 p-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
        <PanelCountPicker value={panelCount} onChange={setPanelCount} disabled={sending} />
        {problem && (
          <p role="alert" className="mt-3 text-center text-sm font-bold text-red-600">
            {problem}
          </p>
        )}
        {needsAvatar && (
          <Link href="/me" className="mt-3 block text-center font-bold underline">
            Create my avatar
          </Link>
        )}
        <Button
          onClick={send}
          disabled={
            sending ||
            !hasSomething ||
            recorder.state === "recording" ||
            recorder.state === "requesting"
          }
          className="mt-4 w-full"
        >
          <SparkleIcon className="size-5" />
          Make my sticker
        </Button>
      </div>
    </div>
  );
}
