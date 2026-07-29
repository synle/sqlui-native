import { describe, test, expect, beforeEach } from "vitest";
import type { editor } from "monaco-editor";
import {
  MAX_CACHED_MODELS,
  cacheEditorModel,
  consumeReleasedEditorId,
  disposeEditorModel,
  getEditorModelCacheSize,
  releaseEditorModel,
  resetEditorModelCache,
  takeCachedEditorModel,
} from "src/frontend/components/CodeEditorBox/editorModelCache";

type FakeModel = editor.ITextModel & { disposed: boolean; attached: boolean };

function createFakeModel(options?: { attached?: boolean; disposed?: boolean }): FakeModel {
  const model = {
    disposed: !!options?.disposed,
    attached: !!options?.attached,
    isDisposed() {
      return model.disposed;
    },
    isAttachedToEditor() {
      return model.attached;
    },
    dispose() {
      model.disposed = true;
    },
  };
  return model as unknown as FakeModel;
}

describe("editorModelCache", () => {
  beforeEach(() => {
    resetEditorModelCache();
  });

  test("parks and restores a model by id", () => {
    const model = createFakeModel();
    cacheEditorModel("query-1", model);

    expect(getEditorModelCacheSize()).toBe(1);
    expect(takeCachedEditorModel("query-1")).toBe(model);
    // taking the model removes it, so the cache only ever holds detached models
    expect(getEditorModelCacheSize()).toBe(0);
    expect(takeCachedEditorModel("query-1")).toBeUndefined();
  });

  test("never restores a disposed model", () => {
    const model = createFakeModel({ disposed: true });
    cacheEditorModel("query-1", model);

    expect(takeCachedEditorModel("query-1")).toBeUndefined();
    expect(getEditorModelCacheSize()).toBe(0);
  });

  test("returns undefined for an anonymous editor", () => {
    expect(takeCachedEditorModel(undefined)).toBeUndefined();
  });

  test("evicts and disposes the least recently used model past the cap", () => {
    const oldest = createFakeModel();
    cacheEditorModel("query-oldest", oldest);

    for (let i = 0; i < MAX_CACHED_MODELS; i++) {
      cacheEditorModel(`query-${i}`, createFakeModel());
    }

    expect(getEditorModelCacheSize()).toBe(MAX_CACHED_MODELS);
    expect(oldest.disposed).toBe(true);
    expect(takeCachedEditorModel("query-oldest")).toBeUndefined();
  });

  test("re-parking an id refreshes its recency instead of duplicating it", () => {
    const model = createFakeModel();
    cacheEditorModel("query-1", model);
    cacheEditorModel("query-1", model);

    expect(getEditorModelCacheSize()).toBe(1);
    expect(model.disposed).toBe(false);
  });

  test("eviction never disposes a model that is still attached to an editor", () => {
    const attached = createFakeModel({ attached: true });
    cacheEditorModel("query-attached", attached);

    for (let i = 0; i < MAX_CACHED_MODELS; i++) {
      cacheEditorModel(`query-${i}`, createFakeModel());
    }

    expect(attached.disposed).toBe(false);
  });

  test("disposeEditorModel skips missing, disposed, and attached models", () => {
    const attached = createFakeModel({ attached: true });
    disposeEditorModel(attached);
    expect(attached.disposed).toBe(false);

    const detached = createFakeModel();
    disposeEditorModel(detached);
    expect(detached.disposed).toBe(true);

    expect(() => disposeEditorModel(undefined)).not.toThrow();
  });

  test("releaseEditorModel disposes a parked model right away", () => {
    const model = createFakeModel();
    cacheEditorModel("query-1", model);

    releaseEditorModel("query-1");

    expect(model.disposed).toBe(true);
    expect(getEditorModelCacheSize()).toBe(0);
    expect(consumeReleasedEditorId("query-1")).toBe(false);
  });

  test("releaseEditorModel tombstones an id whose editor is still mounted", () => {
    // nothing parked yet — the editor still holds the model
    releaseEditorModel("query-live");

    expect(consumeReleasedEditorId("query-live")).toBe(true);
    // the marker is consumed exactly once
    expect(consumeReleasedEditorId("query-live")).toBe(false);
  });
});
