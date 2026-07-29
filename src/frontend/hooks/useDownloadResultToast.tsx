/** Hook that wraps the save-text-file flow with a confirmation toast and a reveal-in-finder action. */
import React from "react";
import {
  revealItemInDir,
  saveTextFileWithFallback,
  type SaveTextFileResult,
} from "src/frontend/data/file";
import useToaster from "src/frontend/hooks/useToaster";

/** Options accepted by the `downloadResult` callback returned from {@link useDownloadResultToast}. */
export type DownloadResultToastOptions = {
  /** Default filename shown in the native save dialog / browser download. */
  suggestedName: string;
  /** Text payload to persist. */
  content: string;
  /** MIME type used by the browser blob fallback (defaults to "text/plain"). */
  mimeType?: string;
  /** Native save-dialog file-type filters (Tauri/Electron only). */
  filters?: { name: string; extensions: string[] }[];
};

/** Inline link inside the success toast that triggers a reveal-in-finder for the saved file. */
function RevealLink({ path }: { path: string }) {
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    revealItemInDir(path).catch((err) =>
      console.error("useDownloadResultToast.tsx:revealItemInDir", err),
    );
  };
  return (
    <a
      href="#"
      onClick={onClick}
      style={{ color: "#90caf9", textDecoration: "underline", cursor: "pointer" }}
    >
      Click here to reveal in finder
    </a>
  );
}

/**
 * Returns a callback that persists a text payload (CSV / JSON / etc.) and shows a confirmation toast.
 *
 * Desktop (Tauri/Electron): opens a native save dialog. On success, the toast includes a
 * "Click here to reveal in finder" link that opens the OS file manager at the saved file.
 * If the user cancels the dialog, no toast is shown.
 *
 * Browser: falls back to a blob/anchor download; the toast confirms the download without a
 * reveal link (the browser writes to a folder the renderer can't introspect).
 *
 * @returns A function that takes a {@link DownloadResultToastOptions} and resolves once the
 *   save flow + toast have been triggered.
 */
export function useDownloadResultToast() {
  const { add: addToast } = useToaster();

  const downloadResult = async (opts: DownloadResultToastOptions): Promise<SaveTextFileResult> => {
    const result = await saveTextFileWithFallback(opts);
    if (result.kind === "saved") {
      await addToast({
        message: (
          <span>
            Downloaded <strong>{opts.suggestedName}</strong> successfully.{" "}
            <RevealLink path={result.path} />
          </span>
        ),
        persisted: false,
      });
    } else if (result.kind === "downloaded") {
      await addToast({
        message: (
          <span>
            Downloaded <strong>{opts.suggestedName}</strong> successfully.
          </span>
        ),
        persisted: false,
      });
    }
    // "cancelled" → no toast (user explicitly dismissed the dialog)
    return result;
  };

  return { downloadResult };
}
