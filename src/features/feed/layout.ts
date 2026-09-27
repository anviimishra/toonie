import { PANEL_COUNT_MAX } from "@/types";

/**
 * How many panels sit in each row of a comic's thumbnail, top to bottom.
 * Mirrors a comic page: one hero, then a wide shot over two, then grids.
 *
 *   1 -> [1]      2 -> [2]      3 -> [1, 2]
 *   4 -> [2, 2]   5 -> [2, 3]   6 -> [3, 3]
 */
const ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  3: [1, 2],
  4: [2, 2],
  5: [2, 3],
  6: [3, 3],
};

export function panelRows(count: number): number[] {
  const n = Math.min(PANEL_COUNT_MAX, Math.max(0, Math.floor(count)));
  return n === 0 ? [] : ROWS[n];
}

/**
 * Splits items into the rows `panelRows` describes. Extra items beyond six are
 * dropped: a thumbnail never shows more than a comic can have.
 */
export function groupIntoRows<T>(items: readonly T[]): T[][] {
  const rows: T[][] = [];
  let start = 0;
  for (const size of panelRows(items.length)) {
    rows.push(items.slice(start, start + size));
    start += size;
  }
  return rows;
}
