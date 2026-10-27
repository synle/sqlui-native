// @vitest-environment jsdom
// Full-suite parallel load exceeded the 10-second unit timeout on Monaco imports; keep these checks in the integration suite.
import { describe, expect, test, vi } from "vitest";

const workerMocks = vi.hoisted(() => ({
  editor: class EditorWorker {},
  json: class JsonWorker {},
}));

vi.mock("monaco-editor/editor/editor.worker.js?worker", () => ({ default: workerMocks.editor }));
vi.mock("monaco-editor/languages/features/json/json.worker.js?worker", () => ({ default: workerMocks.json }));

describe("Monaco package integration", () => {
  test("registers application languages through the real Monaco entrypoint", async () => {
    const { monaco } = await import("src/frontend/monacoSetup");
    const languageIds = monaco.languages.getLanguages().map(({ id }) => id);

    expect(languageIds).toContain("sql");
    expect(languageIds).toContain("json");
    expect((monaco.languages as any).json).toBeDefined();
  });

  test("routes JSON models to the JSON worker and other models to the editor worker", async () => {
    await import("src/frontend/monacoSetup");
    const getWorker = (window as any).MonacoEnvironment.getWorker;

    expect(getWorker("worker-id", "json")).toBeInstanceOf(workerMocks.json);
    expect(getWorker("worker-id", "editor")).toBeInstanceOf(workerMocks.editor);
  });
});
