import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./time";

// Local-time constructors, so these hold in any timezone.
const NOW = new Date(2026, 8, 26, 15, 0, 0); // Sat 26 Sep 2026, 3pm

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

const MIN = 60_000;
const HOUR = 60 * MIN;

describe("formatRelativeTime", () => {
  it.each([
    [0, "Just now"],
    [30_000, "Just now"],
    [MIN, "1m ago"],
    [59 * MIN, "59m ago"],
    [HOUR, "1h ago"],
    [2 * HOUR + 40 * MIN, "2h ago"],
    [14 * HOUR, "14h ago"],
  ])("renders %sms ago as %s", (ms, expected) => {
    expect(formatRelativeTime(ago(ms), NOW)).toBe(expected);
  });

  it("says Yesterday for the previous calendar day", () => {
    expect(formatRelativeTime(new Date(2026, 8, 25, 20, 0), NOW)).toBe("Yesterday");
    expect(formatRelativeTime(new Date(2026, 8, 25, 0, 5), NOW)).toBe("Yesterday");
  });

  it("keeps hours just after midnight rather than jumping to Yesterday", () => {
    const earlyMorning = new Date(2026, 8, 26, 1, 0);
    expect(formatRelativeTime(new Date(2026, 8, 25, 23, 0), earlyMorning)).toBe("2h ago");
  });

  it("uses the weekday within the past week", () => {
    expect(formatRelativeTime(new Date(2026, 8, 23, 9, 0), NOW)).toBe("Wednesday");
    expect(formatRelativeTime(new Date(2026, 8, 20, 9, 0), NOW)).toBe("Sunday");
  });

  it("uses a short date after a week", () => {
    expect(formatRelativeTime(new Date(2026, 8, 19, 9, 0), NOW)).toBe("Sep 19");
    expect(formatRelativeTime(new Date(2026, 2, 4, 9, 0), NOW)).toBe("Mar 4");
  });

  it("adds the year when it isn't this year", () => {
    expect(formatRelativeTime(new Date(2025, 11, 31, 9, 0), NOW)).toBe("Dec 31, 2025");
  });

  it("treats future times from clock skew as just now", () => {
    expect(formatRelativeTime(new Date(NOW.getTime() + 5 * MIN), NOW)).toBe("Just now");
  });

  it("accepts ISO strings and epoch numbers", () => {
    expect(formatRelativeTime(ago(3 * HOUR).toISOString(), NOW.getTime())).toBe("3h ago");
  });

  it("returns an empty string for a bad date", () => {
    expect(formatRelativeTime("not a date", NOW)).toBe("");
  });
});
