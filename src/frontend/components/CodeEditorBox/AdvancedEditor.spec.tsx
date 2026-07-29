// @vitest-environment jsdom
import { render } from "@testing-library/react";
import { describe, test, expect, beforeEach, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const createdEditors: any[] = [];
  const createdModels: any[] = [];

  /** Builds a fake Monaco text model with just enough surface for AdvancedEditor. */
  const makeModel = (value: string, language?: string) => {
    const model: any = {
      value,
      language,
      disposed: false,
      attachedCount: 0,
      isDisposed: () => model.disposed,
      isAttachedToEditor: () => model.attachedCount > 0,
      dispose: () => {
        model.disposed = true;
      },
      getValue: () => model.value,
      setValue: (newValue: string) => {
        model.value = newValue;
      },
      getFullModelRange: () => ({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 1,
      }),
      getLineCount: () => 1,
      getLineMaxColumn: () => model.value.length + 1,
      getPositionAt: () => ({ lineNumber: 1, column: 1 }),
      getValueInRange: () => model.value,
      getWordUntilPosition: () => ({ startColumn: 1, endColumn: 1 }),
      onDidChangeContent: () => ({ dispose: () => {} }),
    };
    createdModels.push(model);
    return model;
  };

  const monaco: any = {
    editor: {
      create: vi.fn((_container: HTMLElement, options: any) => {
        const editor: any = {
          options,
          model: options.model,
          disposed: false,
          getModel: () => editor.model,
          setModel: (newModel: any) => {
            editor.model = newModel;
          },
          getValue: () => editor.model?.getValue() ?? "",
          setValue: (newValue: string) => editor.model?.setValue(newValue),
          dispose: vi.fn(() => {
            editor.disposed = true;
            if (editor.model) editor.model.attachedCount--;
          }),
          updateOptions: vi.fn(),
          onDidBlurEditorWidget: vi.fn(() => ({ dispose: () => {} })),
          onDidChangeModelContent: vi.fn(() => ({ dispose: () => {} })),
          getSelection: () => null,
          setSelection: vi.fn(),
          getPosition: () => ({ lineNumber: 1, column: 1 }),
          executeEdits: vi.fn((_source: any, edits: any[]) =>
            editor.model?.setValue(edits[0].text),
          ),
          pushUndoStop: vi.fn(),
          deltaDecorations: vi.fn(() => []),
        };
        if (editor.model) editor.model.attachedCount++;
        createdEditors.push(editor);
        return editor;
      }),
      createModel: vi.fn((value: string, language?: string) => makeModel(value, language)),
      setTheme: vi.fn(),
      setModelLanguage: vi.fn(),
    },
    languages: {
      CompletionItemKind: { Module: 1, Struct: 2, Field: 3, Variable: 4 },
      registerCompletionItemProvider: vi.fn(() => ({ dispose: vi.fn() })),
    },
    Range: class {},
    Selection: class {},
  };

  return { monaco, createdEditors, createdModels };
});

vi.mock("src/frontend/monacoSetup", () => ({ monaco: mocks.monaco, default: mocks.monaco }));

vi.mock("src/frontend/hooks/useSetting", () => ({
  useDarkModeSetting: () => "light",
  useEditorModeSetting: () => "advanced",
  useWordWrapSetting: () => false,
}));

import AdvancedEditor from "src/frontend/components/CodeEditorBox/AdvancedEditor";
import {
  getEditorModelCacheSize,
  releaseEditorModel,
  resetEditorModelCache,
} from "src/frontend/components/CodeEditorBox/editorModelCache";

describe("AdvancedEditor", () => {
  beforeEach(() => {
    resetEditorModelCache();
    mocks.createdEditors.length = 0;
    mocks.createdModels.length = 0;
    mocks.monaco.editor.create.mockClear();
    mocks.monaco.editor.createModel.mockClear();
    mocks.monaco.editor.setTheme.mockClear();
    mocks.monaco.editor.setModelLanguage.mockClear();
  });

  test("disposes the editor on unmount so it leaves Monaco's global editor registry", () => {
    // Regression: the old teardown closed over `editor` from the first render (always null) so
    // dispose() never ran. Leaked editors keep winning getFocusedCodeEditor() and swallow keys.
    const { unmount } = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);

    expect(mocks.createdEditors).toHaveLength(1);
    expect(mocks.createdEditors[0].disposed).toBe(false);

    unmount();

    expect(mocks.createdEditors[0].disposed).toBe(true);
  });

  test("create count matches dispose count across repeated tab switches", () => {
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);
      unmount();
    }

    expect(mocks.createdEditors).toHaveLength(10);
    expect(mocks.createdEditors.every((editor) => editor.disposed)).toBe(true);
  });

  test("keeps the model alive across unmount and reuses it on remount", () => {
    const first = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);
    const model = mocks.createdEditors[0].model;

    first.unmount();

    // disposing the editor must NOT dispose the model — that is what preserves the undo stack
    expect(model.disposed).toBe(false);
    expect(model.isAttachedToEditor()).toBe(false);
    expect(getEditorModelCacheSize()).toBe(1);

    mocks.monaco.editor.createModel.mockClear();
    const second = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);

    expect(mocks.monaco.editor.createModel).not.toHaveBeenCalled();
    expect(mocks.createdEditors[1].model).toBe(model);
    // while mounted the model is out of the cache, so it can never be evicted from under a live editor
    expect(getEditorModelCacheSize()).toBe(0);

    second.unmount();
  });

  test("does not reuse a disposed model", () => {
    const first = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);
    const model = mocks.createdEditors[0].model;
    first.unmount();

    model.disposed = true;
    mocks.monaco.editor.createModel.mockClear();

    const second = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);

    expect(mocks.monaco.editor.createModel).toHaveBeenCalledTimes(1);
    expect(mocks.createdEditors[1].model).not.toBe(model);

    second.unmount();
  });

  test("disposes the model of an editor that has no id", () => {
    const { unmount } = render(<AdvancedEditor value="SELECT 1" language="sql" />);
    const model = mocks.createdEditors[0].model;

    unmount();

    expect(model.disposed).toBe(true);
    expect(getEditorModelCacheSize()).toBe(0);
  });

  test("applies language, word wrap and theme in place instead of recreating the editor", () => {
    const { rerender, unmount } = render(
      <AdvancedEditor id="query-1" value="SELECT 1" language="sql" wordWrap={false} />,
    );

    expect(mocks.monaco.editor.create).toHaveBeenCalledTimes(1);
    const editor = mocks.createdEditors[0];

    rerender(
      <AdvancedEditor id="query-1" value="SELECT 1" language="javascript" wordWrap={true} />,
    );

    // still a single editor — recreating it is what leaked zombies in the first place
    expect(mocks.monaco.editor.create).toHaveBeenCalledTimes(1);
    expect(editor.disposed).toBe(false);
    expect(mocks.monaco.editor.setModelLanguage).toHaveBeenCalledWith(editor.model, "javascript");
    expect(editor.updateOptions).toHaveBeenCalledWith(expect.objectContaining({ wordWrap: "on" }));
    expect(mocks.monaco.editor.setTheme).toHaveBeenCalledWith("light");

    unmount();
  });

  test("discards rather than parks the model when the id was released while mounted", () => {
    const { unmount } = render(<AdvancedEditor id="query-1" value="SELECT 1" language="sql" />);
    const model = mocks.createdEditors[0].model;

    // closing the query tab happens before React unmounts the editor
    releaseEditorModel("query-1");
    unmount();

    expect(model.disposed).toBe(true);
    expect(getEditorModelCacheSize()).toBe(0);
  });

  test("exposes selection and value helpers through editorRef", () => {
    const editorRef = { current: undefined } as any;
    const { unmount } = render(
      <AdvancedEditor id="query-1" value="SELECT 1" language="sql" editorRef={editorRef} />,
    );

    expect(editorRef.current?.getValue()).toBe("SELECT 1");

    unmount();
  });
});
