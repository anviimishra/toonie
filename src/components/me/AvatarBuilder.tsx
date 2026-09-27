"use client";

import { Button } from "@/components/Button";
import {
  AVATAR_PRESETS,
  type AvatarConfig,
  BACKGROUNDS,
  HAIR_COLORS,
  HAIR_STYLES,
  SKIN_TONES,
  backgroundColor,
  findPreset,
  hairColor,
  hairStyle,
  matchingPreset,
  randomConfig,
  skinTone,
} from "@/features/avatar";
import { AvatarFace } from "./AvatarFace";
import { AvatarStage } from "./AvatarStage";
import { ChipRadioGroup, Swatch } from "./ChipRadioGroup";
import { CheckIcon, DiceIcon } from "./icons";

type Props = {
  config: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
  onSave: () => void;
  saving: boolean;
  /** True when this exact look is already the saved avatar. */
  saved: boolean;
};

const PRESET_OPTIONS = AVATAR_PRESETS.map(({ id, name }) => ({ value: id, label: name }));
const GLASSES_OPTIONS = [
  { value: "off", label: "No glasses" },
  { value: "on", label: "Glasses" },
] as const;

/**
 * Build an avatar: pick a starter character, then tweak it chip by chip. The
 * big preview up top and the small one in the save bar both update on every
 * tap, so there is always a live preview on screen however far you scroll.
 */
export function AvatarBuilder({ config, onChange, onSave, saving, saved }: Props) {
  const preset = matchingPreset(config);
  const set = (patch: Partial<AvatarConfig>) => onChange({ ...config, ...patch });

  return (
    <>
      <AvatarStage
        below={
          <p className="text-sm font-bold text-stone-500">
            {preset ? `Meet ${preset.name}!` : "Looking good!"}
          </p>
        }
      >
        <AvatarFace
          key={preset?.id ?? "custom"}
          config={config}
          size="fill"
          label="Preview of your avatar"
          className="me-pop"
        />
      </AvatarStage>

      <div className="mx-3 mt-4 flex flex-col gap-5 rounded-[28px] bg-white/90 p-4 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
        <ChipRadioGroup
          label="Start with a friend"
          valueLabel={preset ? preset.name : "Your own"}
          options={PRESET_OPTIONS}
          value={preset?.id ?? null}
          onChange={(id) => {
            const chosen = findPreset(id);
            if (chosen) onChange({ ...chosen.config });
          }}
          columns={4}
          variant="tile"
          showTileLabel
          renderChip={(option) => {
            const chosen = findPreset(option.value);
            return chosen && <AvatarFace config={chosen.config} size="fill" />;
          }}
        />

        <ChipRadioGroup
          label="Skin"
          valueLabel={skinTone(config.skin).label}
          options={SKIN_TONES}
          value={config.skin}
          onChange={(skin) => set({ skin })}
          columns={6}
          variant="swatch"
          renderChip={(option) => <Swatch color={skinTone(option.value).fill} />}
        />

        <ChipRadioGroup
          label="Hair"
          valueLabel={hairStyle(config.hair).label}
          options={HAIR_STYLES}
          value={config.hair}
          onChange={(hair) => set({ hair })}
          columns={6}
          variant="tile"
          renderChip={(option) => (
            <AvatarFace config={{ ...config, hair: option.value }} size="fill" />
          )}
        />

        <ChipRadioGroup
          label="Hair colour"
          valueLabel={hairColor(config.hairColor).label}
          options={HAIR_COLORS}
          value={config.hairColor}
          onChange={(value) => set({ hairColor: value })}
          columns={6}
          variant="swatch"
          renderChip={(option) => <Swatch color={hairColor(option.value).fill} />}
        />

        <ChipRadioGroup
          label="Glasses"
          options={GLASSES_OPTIONS}
          value={config.glasses ? "on" : "off"}
          onChange={(value) => set({ glasses: value === "on" })}
          columns={2}
          variant="text"
        />

        <ChipRadioGroup
          label="Background"
          valueLabel={backgroundColor(config.background).label}
          options={BACKGROUNDS}
          value={config.background}
          onChange={(background) => set({ background })}
          columns={6}
          variant="swatch"
          renderChip={(option) => <Swatch color={backgroundColor(option.value).fill} />}
        />

        <Button variant="secondary" onClick={() => onChange(randomConfig())} className="w-full">
          <DiceIcon className="size-5" />
          Surprise me
        </Button>
      </div>

      {/* Save bar: sticks to the bottom of the scroll area with a small live
          preview, so the button and the look are always in reach. */}
      <div className="sticky bottom-0 z-10 mt-2 px-3 pt-4 pb-3">
        <div className="flex items-center gap-3 rounded-[28px] bg-white/95 p-2.5 pl-3 shadow-card ring-1 ring-orange-100/70 backdrop-blur">
          <span className="rounded-full shadow-[0_4px_10px_-2px_rgb(154_52_18/0.35)] ring-2 ring-white">
            <AvatarFace config={config} size="sm" />
          </span>
          <p aria-live="polite" className="min-w-0 flex-1 text-sm font-extrabold text-stone-600">
            {saved ? (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckIcon className="size-4" strokeWidth={3} />
                Saved
              </span>
            ) : (
              "Not saved yet"
            )}
          </p>
          <Button onClick={onSave} disabled={saving || saved} className="px-5 py-3 text-base">
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </>
  );
}
