import type { FeedAdapter, FeedItem } from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Seed = Omit<FeedItem, "createdAt"> & { ago: number };

/**
 * Mock comics. Scenes are written the way the LLM script will phrase them, so
 * the stand-in art has the same kind of text to key off.
 */
const SEEDS: Seed[] = [
  {
    id: "pie-disaster",
    sender: { name: "Grandma Rose", color: "#f9a8d4" },
    title: "The Great Pie Disaster",
    ago: 2 * HOUR,
    status: "new",
    panels: [
      {
        scene: "Grandma in her kitchen proudly holding a cherry pie",
        caption: "I baked my famous cherry pie for the church sale.",
      },
      {
        scene: "Kitchen, the cat creeping along the table toward the pie",
        caption: "Whiskers had other plans.",
      },
      {
        scene: "Kitchen, pie upside down on the floor, grandma surprised, cat looking guilty",
        caption: "Oh no! Pie everywhere!",
      },
      {
        scene: "Night on the porch, grandma and the cat sharing ice cream under the moon",
        caption: "So we had ice cream instead. Nobody complained.",
      },
    ],
  },
  {
    id: "fish-that-got-away",
    sender: { name: "Dad", color: "#93c5fd" },
    title: "The One That Got Away",
    ago: 5 * HOUR + 20 * MINUTE,
    status: "new",
    panels: [
      {
        scene: "Dad and Uncle Tom in a boat on the lake at sunrise",
        caption: "Out on the lake before anyone else was up.",
      },
      {
        scene: "A huge fish jumping out of the lake, dad surprised",
        caption: "Then THIS guy showed up. Biggest fish I've ever seen.",
      },
      {
        scene: "Dad sad on the boat holding an empty fishing line",
        caption: "He said no thank you and swam off. I'll get him next time.",
      },
    ],
  },
  {
    id: "farm-trip",
    sender: { name: "Ms. Patel's class", color: "#86efac" },
    title: "Our Trip to Sunny Acres Farm",
    ago: DAY + 3 * HOUR,
    status: "seen",
    panels: [
      {
        scene: "The class waving from a yellow school bus",
        caption: "Room 12 is off to the farm!",
      },
      {
        scene: "Kids and a friendly farm dog in a field of flowers",
        caption: "We met Biscuit. He is a very good boy.",
      },
      {
        scene: "Everyone picking apples from a big tree in the orchard",
        caption: "We picked 40 apples. Ms. Patel counted.",
      },
      {
        scene: "Rain pouring on the picnic, kids surprised",
        caption: "Then it rained on our sandwiches.",
      },
      {
        scene: "Kids reading a book about farm animals inside the barn",
        caption: "So we read about cows while the storm passed.",
      },
      {
        scene: "The class asleep on the bus ride back at night",
        caption: "Best field trip ever. Zzz.",
      },
    ],
  },
  {
    id: "snow-day",
    sender: { name: "Grandpa Joe", color: "#c4b5fd" },
    title: "Snow Day Champion",
    ago: 3 * DAY + 2 * HOUR,
    status: "seen",
    panels: [
      {
        scene: "Grandpa looking out at deep snow on the yard",
        caption: "Woke up to a foot of snow.",
      },
      {
        scene: "Grandpa and the dog building a snowman in the snow",
        caption: "Rufus helped. Mostly by digging.",
      },
      {
        scene: "The snowman wearing grandpa's hat, dog proud",
        caption: "Say hello to Sir Frosty.",
      },
      {
        scene: "Snowball fight with the neighbour kids, grandpa surprised",
        caption: "I was ambushed.",
      },
      {
        scene: "Grandpa inside by the window with cocoa and a book at night",
        caption: "Cocoa for the champion.",
      },
    ],
  },
  {
    id: "kevin-the-rock",
    sender: { name: "Leo", color: "#fcd34d" },
    title: "I Found Kevin",
    ago: 6 * DAY,
    status: "seen",
    panels: [
      {
        scene: "A kid in the park holding up a very round rock",
        caption: "This is Kevin. He is a very round rock. He lives with me now.",
      },
    ],
  },
  {
    id: "beach-day",
    sender: { name: "Aunt Mei", color: "#fdba74" },
    title: "Beach Day",
    ago: 12 * DAY,
    status: "seen",
    panels: [
      {
        scene: "Aunt Mei and the cousins playing with a beach ball on the sand",
        caption: "The cousins versus me. I lost.",
      },
      {
        scene: "Everyone watching the sunset at the beach",
        caption: "Worth it for this view though.",
      },
    ],
  },
];

function clone(item: FeedItem): FeedItem {
  return { ...item, sender: { ...item.sender }, panels: item.panels.map((p) => ({ ...p })) };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Pretends to be the inbox so the feed can be built and demoed before the
 * backend exists. Keeps "seen" in memory for the life of the page.
 *
 * Replace with the real adapter -- GET /api/feed -- when it lands. The screens
 * import FeedAdapter, never this file directly.
 */
export function createStubFeed(now: number = Date.now(), latencyMs = 250): FeedAdapter {
  const items: FeedItem[] = SEEDS.map(({ ago, ...rest }) => ({
    ...rest,
    createdAt: new Date(now - ago).toISOString(),
  }));

  return {
    async list() {
      await wait(latencyMs);
      return [...items]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .map(clone);
    },
    async get(id) {
      await wait(latencyMs);
      const found = items.find((item) => item.id === id);
      return found ? clone(found) : null;
    },
    async markSeen(id) {
      const found = items.find((item) => item.id === id);
      if (found) found.status = "seen";
    },
  };
}
