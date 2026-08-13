/** Row identity and height estimation helpers used to configure the connection tree virtualizer. */
import { getSanitizedConnectionUrl } from "src/frontend/utils/commonUtils";
import { TreeRow } from "./types";

/** Default row height in pixels for tree rows. */
export const ROW_HEIGHT_DEFAULT = 37;

/** Compact mode row height in pixels. */
export const ROW_HEIGHT_COMPACT = 28;

/** Row height in pixels for a single attribute line inside a column-attributes row. */
export const ROW_HEIGHT_COLUMN_ATTRIBUTES = 35;

/** Extra height in pixels contributed by the connection url subtitle rendered under a connection name. */
export const ROW_HEIGHT_CONNECTION_SUBTITLE_DEFAULT = 21;

/** Compact mode extra height in pixels for the connection url subtitle. */
export const ROW_HEIGHT_CONNECTION_SUBTITLE_COMPACT = 17;

/**
 * Returns the virtualizer key for the row at `index`.
 *
 * The virtualizer caches measured heights against this key, so it has to identify the row rather
 * than its position: with the default key (the index), expanding or collapsing a node shifts every
 * row below it onto a neighbour's cached height, and rows paint on top of each other until a scroll
 * remounts — and therefore re-measures — them.
 * @param rows - The current flat row list.
 * @param index - Position of the row in that list.
 * @returns The row's stable key, falling back to the index while the list is out of sync.
 */
export function getTreeRowKey(rows: TreeRow[], index: number): string | number {
  return rows[index]?.key ?? index;
}

/**
 * Estimates the height of a tree row before it has been measured.
 * Only affects rows that are not currently mounted, so it drives scrollbar accuracy rather than layout.
 * @param rows - The current flat row list.
 * @param index - Position of the row in that list.
 * @param isCompact - Whether the compact layout mode is active.
 * @returns The estimated row height in pixels.
 */
export function estimateTreeRowHeight(rows: TreeRow[], index: number, isCompact: boolean): number {
  const rowHeight = isCompact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_DEFAULT;
  const row = rows[index];

  if (!row) {
    return rowHeight;
  }

  if (row.type === "column-attributes") {
    return (Object.keys(row.column).length + 1) * ROW_HEIGHT_COLUMN_ATTRIBUTES;
  }

  // Connection headers stack the connection url under the connection name, so they run a line taller.
  if (row.type === "connection-header" && getSanitizedConnectionUrl(row.connection.connection)) {
    return rowHeight + (isCompact ? ROW_HEIGHT_CONNECTION_SUBTITLE_COMPACT : ROW_HEIGHT_CONNECTION_SUBTITLE_DEFAULT);
  }

  return rowHeight;
}
