import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import { useCallback, useEffect, useRef, useState } from "react";
import { styled } from "@mui/system";
import { CompletionItem, DecoratedEditorProps as AdvancedEditorProps } from "src/frontend/components/CodeEditorBox";
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

const EDITOR_MODELS_MAP: Record<string, any> = {};

/**
 * Monaco-based code editor with undo/redo stack preservation, dark mode support, and selection text retrieval.
 * @param props - Editor configuration including value, language, word wrap, and editor ref.
 * @returns The rendered Monaco editor container.
 */
export default function AdvancedEditor(props: AdvancedEditorProps): JSX.Element | null {
  const colorMode = useDarkModeSetting();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onSetupMonacoEditor = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      editor?.dispose();

      if (monacoEl.current) {
        //@ts-ignore
        const newEditor = window.monaco.editor.create(monacoEl.current!, {
          value: props.value,
          language: props.language,
          theme: colorMode === "dark" ? "vs-dark" : "light",
          wordWrap: props.wordWrap === true ? "on" : "off",
          readOnly: !!props.readOnly,
          ...DEFAULT_OPTIONS,
        });

        newEditor.onDidBlurEditorWidget(() => {
          props.onBlur && props.onBlur(newEditor.getValue() || "");
        });

        if (props.onLiveChange) {
          newEditor.onDidChangeModelContent(() => {
            props.onLiveChange!(newEditor.getValue() || "");
          });
        }

        // clean up the model as we don't need it while it's active
        if (props.id && EDITOR_MODELS_MAP[props.id]) {
          newEditor.setModel(EDITOR_MODELS_MAP[props.id]);
          delete EDITOR_MODELS_MAP[props.id];
        }

        setEditor(newEditor);
      }
    }, 100);
  }, [editor, props.value, props.language, props.wordWrap, props.id, props.onBlur, colorMode]);

  // this is used to clean up the editor
  useEffect(() => {
    return () => {
      // dispose the editor
      editor?.dispose();
      setEditor(null);
    };
  }, []);

  // this is used to clean up the editor
  useEffect(() => {
    return () => {
      // keep track of the undo if we need it
      if (editor && props.id) {
        // https://stackoverflow.com/questions/48210120/get-restore-monaco-editor-undoredo-stack
        EDITOR_MODELS_MAP[props.id] = editor?.getModel();
      }
    };
  }, [editor, props.id]);
  // we used this block to set the value of the editor
  useEffect(() => {
    if (editor) {
      const newValue = props.value || "";

      // https://stackoverflow.com/questions/60965171/not-able-to-do-undo-in-monaco-editor
      // NOTE we can't do setValue here because it will wipe out the undo stack
      // Select all text
      const fullRange = editor.getModel()?.getFullModelRange();

      if (fullRange !== undefined) {
        // Apply the text over the range
        editor.executeEdits(null, [
          {
            text: newValue,
            range: fullRange,
          },
        ]);

        editor.setSelection(new monaco.Selection(1, 1, 1, 1));

        // Indicates the above edit is a complete undo/redo change.
        editor.pushUndoStop();
      } else {
        // fall back to use setValue if we can't find the range
        editor.setValue(newValue);
      }
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

  // register autocomplete suggestions from connection metadata
  useEffect(() => {
    if (!props.completionItems || props.completionItems.length === 0) {
      return;
    }

    const globalMonaco = (window as any).monaco as typeof monaco | undefined;
    if (!globalMonaco) {
      return;
    }

    const kindMap: Record<CompletionItem["kind"], monaco.languages.CompletionItemKind> = {
      database: globalMonaco.languages.CompletionItemKind.Module,
      table: globalMonaco.languages.CompletionItemKind.Struct,
      column: globalMonaco.languages.CompletionItemKind.Field,
    };

    const language = props.language || "sql";

    const disposable = globalMonaco.languages.registerCompletionItemProvider(language, {
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

  // here we will initiate the editor
  // and can be also be used to update the settings
  useEffect(onSetupMonacoEditor, [monacoEl, props.wordWrap, props.language, colorMode]);

  return (
    <AdvancedEditorContainer
      className="AdvancedEditorContainer"
      ref={monacoEl}
      style={{
        ...(props.fillHeight ? { flex: 1, minHeight: 0 } : { height: props.height }),
      }}
    ></AdvancedEditorContainer>
  );
}
