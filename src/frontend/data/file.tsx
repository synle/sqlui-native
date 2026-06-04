import CsvEngine from "json-2-csv";
import { platform } from "src/frontend/platform";

/** Outcome of {@link saveTextFileWithFallback}. */
export type SaveTextFileResult =
  /** The native save dialog completed and the file was persisted at `path`. */
  | { kind: "saved"; path: string }
  /** Browser/legacy fallback: a blob download was triggered (path unknown). */
  | { kind: "downloaded" }
  /** Desktop save dialog was cancelled by the user — no file written. */
  | { kind: "cancelled" };

/**
 * Downloads a text string as a file in the browser.
 * @param downloadFileName - The name for the downloaded file.
 * @param content - The text content to download.
 * @param mimeType - The MIME type of the content (defaults to "text/csv").
 */
export function downloadText(downloadFileName: string, content: string, mimeType = "text/csv") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Downloads data as a JSON file.
 * @param downloadFileName - The name for the downloaded file.
 * @param data - The data to serialize as JSON.
 */
export function downloadJSON(downloadFileName: string, data) {
  downloadText(downloadFileName, JSON.stringify(data, null, 2), "text/json");
}

/**
 * Downloads data as a CSV file using json-2-csv conversion.
 * @param downloadFileName - The name for the downloaded file.
 * @param data - The array of objects to convert to CSV.
 */
export function downloadCsv(downloadFileName: string, data) {
  const csv = CsvEngine.json2csv(data);
  downloadText(downloadFileName, csv, "text/csv");
}

/**
 * Serializes an array of records to a CSV string using json-2-csv.
 * Use this with {@link saveTextFileWithFallback} when offering a save+reveal flow
 * instead of a fire-and-forget download.
 * @param data - The array of objects to serialize.
 */
export function dataToCsv(data: unknown): string {
  return CsvEngine.json2csv(data as any);
}

/**
 * Downloads a blob URL as a file.
 * @param downloadFileName - The name for the downloaded file.
 * @param blobContent - The blob URL to download.
 */
export function downloadBlob(downloadFileName: string, blobContent: string) {
  const link = document.createElement("a");
  link.setAttribute("href", blobContent);
  link.setAttribute("download", downloadFileName);
  document.body.appendChild(link); // Required for FF

  link.click();
}

/**
 * Persists a text payload through the best available channel for the current platform.
 *
 * Desktop (Tauri/Electron): opens a native save dialog, writes the content to the chosen
 * absolute path, and returns `{ kind: "saved", path }` so the caller can offer a
 * reveal-in-finder follow-up. If the user cancels the dialog, returns
 * `{ kind: "cancelled" }` and nothing is written.
 *
 * Browser: falls back to a blob/anchor download (path unknown) and returns
 * `{ kind: "downloaded" }`.
 *
 * @param opts.suggestedName - Default filename shown in the save dialog / used by the browser.
 * @param opts.content - The text payload to persist.
 * @param opts.mimeType - MIME type used by the browser blob fallback (defaults to "text/plain").
 * @param opts.filters - File-type filters shown in the native save dialog.
 */
export async function saveTextFileWithFallback(opts: {
  suggestedName: string;
  content: string;
  mimeType?: string;
  filters?: { name: string; extensions: string[] }[];
}): Promise<SaveTextFileResult> {
  if (platform.isDesktop) {
    const savedPath = await platform.saveTextFile({
      suggestedName: opts.suggestedName,
      content: opts.content,
      filters: opts.filters,
    });
    if (savedPath) return { kind: "saved", path: savedPath };
    return { kind: "cancelled" };
  }
  downloadText(opts.suggestedName, opts.content, opts.mimeType || "text/plain");
  return { kind: "downloaded" };
}

/**
 * Reveals a previously-saved file in the OS file manager. No-op in browser mode.
 * @param filePath - Absolute path returned by {@link saveTextFileWithFallback}.
 */
export async function revealItemInDir(filePath: string): Promise<void> {
  await platform.revealItemInDir(filePath);
}
