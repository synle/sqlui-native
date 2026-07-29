/** Cache of detached Monaco text models, keyed by editor id, used to preserve undo/redo stacks. */
import type { editor } from "monaco-editor";

/** A Monaco text model. Imported as a type only so this module has no runtime Monaco dependency. */
type TextModel = editor.ITextModel;

/** Maximum number of detached models parked for undo-stack preservation. */
export const MAX_CACHED_MODELS = 50;

/**
 * Detached Monaco text models parked by editor id so closing and reopening a query tab keeps its
 * undo/redo stack. Invariant: this map only ever holds models that are NOT attached to a live
 * editor — a model is taken out of the map while its editor is mounted and put back on unmount.
 */
const EDITOR_MODELS_MAP = new Map<string, TextModel>();

/**
 * Editor ids released while their editor was still mounted. Their model is discarded by the
 * unmount teardown instead of being parked.
 */
const RELEASED_EDITOR_IDS = new Set<string>();

/**
 * Disposes a model, but never one that is still attached to a live editor.
 * @param model - The model to dispose; no-op when missing, already disposed, or still in use.
 */
export function disposeEditorModel(model?: TextModel | null): void {
  if (!model || model.isDisposed() || model.isAttachedToEditor()) {
    return;
  }
  model.dispose();
}

/**
 * Removes and returns the parked model for an editor id, so the caller can attach it to a new editor.
 * @param id - The editor id, or undefined for anonymous editors which are never cached.
 * @returns A reusable model, or undefined when there is nothing usable to restore.
 */
export function takeCachedEditorModel(id?: string): TextModel | undefined {
  if (!id) {
    return undefined;
  }
  const model = EDITOR_MODELS_MAP.get(id);
  EDITOR_MODELS_MAP.delete(id);
  if (!model || model.isDisposed()) {
    return undefined;
  }
  return model;
}

/**
 * Parks a detached model under an editor id, evicting least-recently-used entries past the cap.
 * @param id - The editor id to park the model under.
 * @param model - The detached model to keep for a future remount.
 */
export function cacheEditorModel(id: string, model: TextModel): void {
  EDITOR_MODELS_MAP.delete(id);
  EDITOR_MODELS_MAP.set(id, model);

  for (const [key, cached] of EDITOR_MODELS_MAP) {
    if (EDITOR_MODELS_MAP.size <= MAX_CACHED_MODELS) {
      break;
    }
    EDITOR_MODELS_MAP.delete(key);
    disposeEditorModel(cached);
  }
}

/**
 * Whether an editor id was released while its editor was still mounted. Consumes the marker.
 * @param id - The editor id being torn down.
 * @returns True when the model must be discarded rather than parked.
 */
export function consumeReleasedEditorId(id: string): boolean {
  return RELEASED_EDITOR_IDS.delete(id);
}

/**
 * Discards the model kept for an editor id that will never be shown again, such as a closed query
 * tab. When that editor is still mounted the model is discarded by its unmount teardown instead.
 * @param id - The editor id; for query tabs this is the query id.
 */
export function releaseEditorModel(id: string): void {
  const model = EDITOR_MODELS_MAP.get(id);
  if (model) {
    EDITOR_MODELS_MAP.delete(id);
    disposeEditorModel(model);
    return;
  }
  RELEASED_EDITOR_IDS.add(id);
}

/**
 * Number of models currently parked for reuse. Exposed for diagnostics and tests.
 * @returns The parked model count.
 */
export function getEditorModelCacheSize(): number {
  return EDITOR_MODELS_MAP.size;
}

/** Empties the cache and the released-id markers. Exposed for tests. */
export function resetEditorModelCache(): void {
  for (const model of EDITOR_MODELS_MAP.values()) {
    disposeEditorModel(model);
  }
  EDITOR_MODELS_MAP.clear();
  RELEASED_EDITOR_IDS.clear();
}
