import { describe, expect, it } from "vitest";
import { describeScene, hashString } from "./scene";

describe("hashString", () => {
  it("is stable", () => {
    expect(hashString("a very round rock")).toBe(hashString("a very round rock"));
  });

  it("differs for different text", () => {
    expect(hashString("cat")).not.toBe(hashString("dog"));
  });

  it("is an unsigned 32-bit integer", () => {
    const hash = hashString("anything at all");
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThan(2 ** 32);
  });
});

describe("describeScene", () => {
  it("is deterministic", () => {
    const scene = "Grandma in her kitchen holding a cherry pie";
    expect(describeScene(scene)).toEqual(describeScene(scene));
  });

  it.each([
    ["Night on the porch under the moon", "night"],
    ["Rain pouring on the picnic", "rain"],
    ["Everyone watching the sunset", "sunset"],
    ["A kid in the park", "day"],
  ])("reads the time of day from %j", (scene, time) => {
    expect(describeScene(scene).time).toBe(time);
  });

  it.each([
    ["Playing on the sand at the beach", "beach"],
    ["Building a snowman in the snow", "snow"],
    ["In a boat on the lake", "lake"],
    ["Grandma in her kitchen", "indoors"],
    ["A kid in the park", "outdoors"],
  ])("reads the setting from %j", (scene, setting) => {
    expect(describeScene(scene).setting).toBe(setting);
  });

  it.each([
    ["Pie on the floor, grandma surprised", "surprised"],
    ["Dad sad on the boat", "sad"],
    ["Everyone eating cake", "happy"],
  ])("reads the mood from %j", (scene, mood) => {
    expect(describeScene(scene).mood).toBe(mood);
  });

  it("finds props in the order they are mentioned", () => {
    expect(describeScene("The cat creeping toward the pie").props).toEqual(["cat", "pie"]);
  });

  it("keeps at most two props", () => {
    const spec = describeScene("A dog, a cat, a fish and a ball");
    expect(spec.props).toEqual(["dog", "cat"]);
  });

  it("always has a prop, even when the scene names none", () => {
    for (const scene of ["Hello", "Somewhere nice", "Inside the house", ""]) {
      expect(describeScene(scene).props).toHaveLength(1);
    }
  });

  it("does not mistake parts of words for props", () => {
    expect(describeScene("A snowball fight").props).not.toContain("ball");
    expect(describeScene("Going to the concatenation lecture").props).not.toContain("cat");
  });

  it("puts a crowd in crowd scenes", () => {
    expect(describeScene("The class waving from a bus").characters).toBe(3);
    expect(describeScene("Grandpa and the dog").characters).toBe(2);
  });

  it("keeps the character count between one and three", () => {
    for (const scene of ["a", "b", "c", "d", "e", "f", "someone alone"]) {
      const { characters } = describeScene(scene);
      expect(characters).toBeGreaterThanOrEqual(1);
      expect(characters).toBeLessThanOrEqual(3);
    }
  });
});
