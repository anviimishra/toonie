const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** Whole calendar days between two dates, in local time. DST-safe. */
function calendarDaysBetween(earlier: Date, later: Date): number {
  return Math.round((startOfDay(later) - startOfDay(earlier)) / (24 * HOUR));
}

/**
 * "Just now", "5m ago", "2h ago", "Yesterday", "Tuesday", "Mar 4", "Mar 4, 2025".
 *
 * Hours are used for anything today (or under 6 hours, so 1am doesn't call
 * 11pm "Yesterday"). Weekday names only within the past week, where they
 * can't be ambiguous. Future times, from clock skew, read as "Just now".
 */
export function formatRelativeTime(when: Date | string, now: Date | number = Date.now()): string {
  const then = typeof when === "string" ? new Date(when) : when;
  const current = typeof now === "number" ? new Date(now) : now;
  if (Number.isNaN(then.getTime())) return "";

  const diff = current.getTime() - then.getTime();
  if (diff < MINUTE) return "Just now";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`;

  const days = calendarDaysBetween(then, current);
  if (days === 0 || diff < 6 * HOUR) return `${Math.floor(diff / HOUR)}h ago`;
  if (days === 1) return "Yesterday";
  if (days < 7) return WEEKDAYS[then.getDay()];

  const date = `${MONTHS[then.getMonth()]} ${then.getDate()}`;
  return then.getFullYear() === current.getFullYear() ? date : `${date}, ${then.getFullYear()}`;
}
