/**
 * Turns a panel's scene text into a small, deterministic recipe for the
 * stand-in art: time of day, where it happens, who is in it, and a prop or two.
 *
 * Pure, so the same scene always draws the same picture on every device.
 */

export type SceneTime = "day" | "sunset" | "night" | "rain";
export type SceneSetting = "outdoors" | "beach" | "lake" | "snow" | "indoors";
export type SceneMood = "happy" | "surprised" | "sad";
export type SceneProp =
  | "pie"
  | "cake"
  | "icecream"
  | "cat"
  | "dog"
  | "fish"
  | "boat"
  | "ball"
  | "balloon"
  | "flower"
  | "tree"
  | "rock"
  | "bus"
  | "book"
  | "snowman";

export type SceneSpec = {
  seed: number;
  time: SceneTime;
  setting: SceneSetting;
  mood: SceneMood;
  /** 1 to 3 people. */
  characters: number;
  /** The scene is about a grandparent, so the first person gets grey hair. */
  elder: boolean;
  /** 1 or 2 props, in the order the scene mentions them. */
  props: SceneProp[];
};

/** FNV-1a. Small, fast, and stable across platforms. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function has(text: string, words: string): boolean {
  return new RegExp(`\\b(?:${words})`, "i").test(text);
}

const PROP_WORDS: [SceneProp, string][] = [
  ["pie", "pie|tart|bak"],
  ["cake", "cake|birthday|cupcake"],
  ["icecream", "ice ?cream|cocoa|sundae"],
  ["cat", "cat\\b|cats|kitten|whiskers"],
  ["dog", "dog|pupp|puppy|rufus|biscuit"],
  ["fish", "fish"],
  ["boat", "boat|canoe|kayak"],
  ["ball", "ball\\b|beach ball|soccer|football|basketball"],
  ["balloon", "balloon|party"],
  ["flower", "flower|garden|daisy|roses?\\b"],
  ["tree", "tree|apple|forest|orchard"],
  ["rock", "rock|stone|pebble"],
  ["bus", "bus|car\\b|truck|drive"],
  ["book", "book|read|story"],
  ["snowman", "snowman"],
];

const FALLBACK_PROPS: Record<SceneSetting, SceneProp[]> = {
  outdoors: ["flower", "tree", "ball", "balloon", "rock"],
  beach: ["ball", "balloon", "rock"],
  lake: ["tree", "fish", "flower"],
  snow: ["snowman", "tree"],
  indoors: ["book", "balloon", "cake", "flower"],
};

function pickTime(text: string): SceneTime {
  if (has(text, "rain|storm|puddle|drizzl")) return "rain";
  if (has(text, "night|moon|stars?\\b|dark|bedtime|asleep|sleep")) return "night";
  if (has(text, "sunset|sunrise|dawn|dusk|evening")) return "sunset";
  return "day";
}

function pickSetting(text: string): SceneSetting {
  if (has(text, "beach|sand|seaside|ocean|waves")) return "beach";
  if (has(text, "snow|winter|ice rink|sled")) return "snow";
  if (has(text, "lake|river|pond|boat|fishing|canoe")) return "lake";
  if (
    has(text, "kitchen|house|home|room|inside|indoors|class ?room|barn|window|bed\\b|table|sofa")
  ) {
    return "indoors";
  }
  return "outdoors";
}

function pickMood(text: string): SceneMood {
  if (has(text, "surpris|shock|oh no|wow|ambush|scared|jump")) return "surprised";
  if (has(text, "sad|cry|lost|empty|upset|miss")) return "sad";
  return "happy";
}

function pickCharacters(text: string, seed: number): number {
  if (has(text, "class|everyone|kids|family|friends|cousins|children|we\\b")) return 3;
  if (has(text, "together|with|both|and\\b|sharing")) return 2;
  return 1 + (seed % 2);
}

function pickProps(text: string, setting: SceneSetting, seed: number): SceneProp[] {
  const found = PROP_WORDS.map(([prop, words]) => {
    const match = new RegExp(`\\b(?:${words})`, "i").exec(text);
    return { prop, at: match ? match.index : -1 };
  })
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ prop }) => prop);

  if (found.length > 0) return found.slice(0, 2);
  const options = FALLBACK_PROPS[setting];
  return [options[seed % options.length]];
}

export function describeScene(scene: string): SceneSpec {
  const text = scene.trim();
  const seed = hashString(text.toLowerCase());
  const setting = pickSetting(text);
  return {
    seed,
    time: pickTime(text),
    setting,
    mood: pickMood(text),
    characters: pickCharacters(text, seed),
    elder: has(text, "grand(?:ma|pa|mother|father|ad)|granny|nana|gran\b"),
    props: pickProps(text, setting, seed),
  };
}
