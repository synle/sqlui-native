import React from "react";
import { monaco } from "src/frontend/monacoSetup";
import { useCallback, useEffect, useRef, useState } from "react";
import { styled } from "@mui/system";
import { CompletionItem, DecoratedEditorProps as AdvancedEditorProps, EditorVariable } from "src/frontend/components/CodeEditorBox";
import {
  cacheEditorModel,
  consumeReleasedEditorId,
  disposeEditorModel,
  takeCachedEditorModel,
} from "src/frontend/components/CodeEditorBox/editorModelCache";
import { useDarkModeSetting } from "src/frontend/hooks/useSetting";

const AdvancedEditorContainer = styled("div")(() => {
  return {
    width: "100%",
  };
});

/** Default Monaco editor configuration options. */
const DEFAULT_OPTIONS = {
  // lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  automaticLayout: true,
  minimap: {
    enabled: false,
  },
};

/**
 * Monaco-based code editor with undo/redo stack preservation, dark mode support, and selection text retrieval.
 *
 * The editor instance is created exactly once per mount and is always disposed on unmount. Option
 * changes (theme, word wrap, language, read-only) are applied in place rather than by recreating
 * the editor, because a leaked Monaco editor stays registered in Monaco's global editor registry
 * and can hijack `getFocusedCodeEditor()`, which silently swallows keybindings in the visible editor.
 * @param props - Editor configuration including value, language, word wrap, and editor ref.
 * @returns The rendered Monaco editor container.
 */
export default function AdvancedEditor(props: AdvancedEditorProps): React.JSX.Element | null {
  const colorMode = useDarkModeSetting();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const decorationIdsRef = useRef<string[]>([]);
  /** True during programmatic value sync — suppresses onDidChangeModelContent callbacks. */
  const suppressChangeRef = useRef(false);
  /** True when the editor has user-initiated changes that haven't round-tripped through props yet. */
  const hasPendingChangeRef = useRef(false);

  // Refs for callback props to avoid stale closures in Monaco event handlers
  const onLiveChangeRef = useRef(props.onLiveChange);
  onLiveChangeRef.current = props.onLiveChange;
  const onBlurRef = useRef(props.onBlur);
  onBlurRef.current = props.onBlur;
  const valueRef = useRef(props.value);
  valueRef.current = props.value;

  // Refs read by the create/teardown effect, which intentionally runs only once per mount.
  const idRef = useRef(props.id);
  idRef.current = props.id;
  const languageRef = useRef(props.language);
  languageRef.current = props.language;
  const wordWrapRef = useRef(props.wordWrap);
  wordWrapRef.current = props.wordWrap;
  const readOnlyRef = useRef(props.readOnly);
  readOnlyRef.current = props.readOnly;
  const colorModeRef = useRef(colorMode);
  colorModeRef.current = colorMode;

  /** Resolves the Monaco theme name for the current color mode. */
  const getThemeName = useCallback((mode: string | undefined) => (mode === "dark" ? "vs-dark" : "light"), []);

  // Sync external value changes to the editor (e.g., loading a saved query, applying a template).
  // Skips when the editor already has the same content (round-trip from user typing)
  // or when the editor has pending user-initiated changes (debounce hasn't settled).
  useEffect(() => {
    if (!editor) return;

    const newValue = props.value || "";

    // Skip if editor already has this value — round-trip from typing is complete
    if (editor.getValue() === newValue) {
      hasPendingChangeRef.current = false;
      return;
    }

    // Skip if the editor has pending internal changes (user is actively typing).
    // The debounced onChange will eventually fire and reconcile props with editor state.
    if (hasPendingChangeRef.current) return;

    // Suppress onDidChangeModelContent during programmatic edit to avoid feedback loop
    suppressChangeRef.current = true;

    try {
      // https://stackoverflow.com/questions/60965171/not-able-to-do-undo-in-monaco-editor
      // NOTE we can't do setValue here because it will wipe out the undo stack
      const fullRange = editor.getModel()?.getFullModelRange();

      if (fullRange !== undefined) {
        editor.executeEdits(null, [
          {
            text: newValue,
            range: fullRange,
          },
        ]);

        // Reset cursor only if it's beyond the new content bounds
        const model = editor.getModel();
        const pos = editor.getPosition();
        if (model && pos) {
          const lastLine = model.getLineCount();
          const lastCol = model.getLineMaxColumn(lastLine);
          if (pos.lineNumber > lastLine || (pos.lineNumber === lastLine && pos.column > lastCol)) {
            editor.setSelection(new monaco.Selection(1, 1, 1, 1));
          }
        }

        editor.pushUndoStop();
      } else {
        editor.setValue(newValue);
      }
    } finally {
      suppressChangeRef.current = false;
    }
  }, [editor, props.value, props.id]);

  useEffect(() => {
    if (editor && props.editorRef) {
      // @ts-ignore
      // keep a copy of the editor for ref
      props.editorRef.current = {
        getSelectedText: () => {
          const selection = editor.getSelection();
          if (selection) {
            return editor?.getModel()?.getValueInRange(selection);
          }
        },
        getValue: () => {
          return editor.getValue() || undefined;
        },
      };
    }
  }, [editor, props.editorRef]);

  // Apply the theme in place. Monaco's standalone theme service is global, so this is the same
  // scope the `theme` construction option had.
  useEffect(() => {
    monaco.editor.setTheme(getThemeName(colorMode));
  }, [colorMode, getThemeName]);

  // Apply word wrap / read-only in place instead of recreating the editor.
  useEffect(() => {
    editor?.updateOptions({
      wordWrap: props.wordWrap === true ? "on" : "off",
      readOnly: !!props.readOnly,
    });
  }, [editor, props.wordWrap, props.readOnly]);

  // Apply the language in place instead of recreating the editor.
  useEffect(() => {
    const model = editor?.getModel();
    if (!model || model.isDisposed() || !props.language) return;
    monaco.editor.setModelLanguage(model, props.language);
  }, [editor, props.language]);

  // register autocomplete suggestions from connection metadata
  useEffect(() => {
    if (!props.completionItems || props.completionItems.length === 0) {
      return;
    }

    const kindMap: Record<CompletionItem["kind"], monaco.languages.CompletionItemKind> = {
      database: monaco.languages.CompletionItemKind.Module,
      table: monaco.languages.CompletionItemKind.Struct,
      column: monaco.languages.CompletionItemKind.Field,
      variable: monaco.languages.CompletionItemKind.Variable,
    };

    const language = props.language || "sql";

    const disposable = monaco.languages.registerCompletionItemProvider(language, {
      provideCompletionItems(_model, position) {
        const word = _model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: monaco.languages.CompletionItem[] = (props.completionItems || []).map((item) => ({
          label: item.label,
          kind: kindMap[item.kind],
          detail: item.detail,
          insertText: item.label,
          range,
        }));

        return { suggestions };
      },
    });

    return () => disposable.dispose();
  }, [props.completionItems, props.language]);

  // {{VAR}} decorations — highlight variable placeholders in the editor
  useEffect(() => {
    if (!editor || !props.variables || props.variables.length === 0) return;

    const model = editor.getModel();
    if (!model) return;

    const varMap = new Map<string, EditorVariable>();
    for (const v of props.variables) {
      varMap.set(v.key, v);
    }

    /** Recomputes decorations for all {{VAR}} matches in the editor. */
    const updateDecorations = () => {
      const content = model.getValue();
      const pattern = /\{\{([^}]+)\}\}/g;
      const newDecorations: monaco.editor.IModelDeltaDecoration[] = [];
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(content)) !== null) {
        const varName = match[1].trim();
        const variable = varMap.get(varName);
        if (!variable) continue;

        const startPos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);

        const cssClass = `editor-variable-highlight editor-variable-${variable.source}`;
        const sourceLabel = variable.source === "folder" ? "Folder" : variable.source === "dynamic" ? "Dynamic" : "Connection";

        newDecorations.push({
          range: new monaco.Range(startPos.lineNumber, startPos.column, endPos.lineNumber, endPos.column),
          options: {
            inlineClassName: cssClass,
            hoverMessage: { value: `**\`{{${varName}}}\`** → \`${variable.value}\`\n\n*${sourceLabel} variable*` },
          },
        });
      }

      decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, newDecorations);
    };

    updateDecorations();
    const disposable = model.onDidChangeContent(() => updateDecorations());
    return () => {
      disposable.dispose();
      // The model is parked for reuse, so strip the decorations we added rather than leaving
      // stale ranges behind for the next mount.
      if (!model.isDisposed()) {
        decorationIdsRef.current = editor.deltaDecorations(decorationIdsRef.current, []);
      }
    };
  }, [editor, props.variables]);

  // {{VAR}} autocomplete — suggest variable names when typing {{
  useEffect(() => {
    if (!props.variables || props.variables.length === 0) return;

    const language = props.language || "sql";

    const disposable = monaco.languages.registerCompletionItemProvider(language, {
      triggerCharacters: ["{"],
      provideCompletionItems(model, position) {
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: Math.max(1, position.column - 3),
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        // Only suggest after {{ or {
        if (!textUntilPosition.includes("{")) return { suggestions: [] };

        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const sourceIcon = { connection: "🔗", folder: "📁", dynamic: "⚡" };
        const suggestions: monaco.languages.CompletionItem[] = (props.variables || []).map((v) => ({
          label: `{{${v.key}}}`,
          kind: monaco.languages.CompletionItemKind.Variable,
          detail: `${sourceIcon[v.source] || ""} ${v.enabled ? v.value : `${v.value} (disabled)`}`,
          insertText: `{{${v.key}}}`,
          range,
          sortText: "0",
        }));

        return { suggestions };
      },
    });

    return () => disposable.dispose();
  }, [props.variables, props.language]);

  // Create the editor once per mount and always dispose it on unmount.
  //
  // This effect is declared last on purpose: React runs cleanups in declaration order, so every
  // effect above releases its Monaco disposables while the editor is still alive.
  useEffect(() => {
    const container = monacoEl.current;
    if (!container) return;

    const id = idRef.current;

    // We create and own the model so that `editor.dispose()` does not dispose it — Monaco only
    // disposes a model it created itself (StandaloneEditor._ownsModel). That is what lets the
    // undo stack survive an unmount.
    const restoredModel = takeCachedEditorModel(id);
    const model = restoredModel ?? monaco.editor.createModel(valueRef.current || "", languageRef.current);

    const newEditor = monaco.editor.create(container, {
      model,
      theme: getThemeName(colorModeRef.current),
      wordWrap: wordWrapRef.current === true ? "on" : "off",
      readOnly: !!readOnlyRef.current,
      ...DEFAULT_OPTIONS,
    });

    newEditor.onDidBlurEditorWidget(() => {
      onBlurRef.current?.(newEditor.getValue() || "");
    });

    newEditor.onDidChangeModelContent(() => {
      if (suppressChangeRef.current) return;
      hasPendingChangeRef.current = true;
      onLiveChangeRef.current?.(newEditor.getValue() || "");
    });

    hasPendingChangeRef.current = false;
    setEditor(newEditor);

    return () => {
      const currentId = idRef.current;
      const currentModel = newEditor.getModel();

      newEditor.dispose();
      setEditor(null);

      if (!currentModel || currentModel.isDisposed()) {
        return;
      }

      if (currentId && !consumeReleasedEditorId(currentId)) {
        cacheEditorModel(currentId, currentModel);
        return;
      }

      disposeEditorModel(currentModel);
    };
  }, [getThemeName]);

  return (
    <AdvancedEditorContainer
      className="AdvancedEditorContainer"
      ref={monacoEl}
      style={props.fillHeight ? { flex: 1, minHeight: 0 } : { height: props.height }}
    ></AdvancedEditorContainer>
  );
}
