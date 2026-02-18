import Editor, { OnMount, useMonaco } from "@monaco-editor/react";
import { useCallback, useEffect, useRef } from "react";
import { styled } from "@mui/system";
import { DecoratedEditorProps as AdvancedEditorProps } from "src/frontend/components/CodeEditorBox";
import { useDarkModeSetting } from "src/frontend/hooks/useSetting";

const AdvancedEditorContainer = styled("div")(({ theme }) => {
  return {
    width: "100%",
  };
});

const DEFAULT_OPTIONS = {
  // lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  automaticLayout: true,
  minimap: {
    enabled: false,
  },
};

export default function AdvancedEditor(props: AdvancedEditorProps): JSX.Element | null {
  const colorMode = useDarkModeSetting();
  const editorInstanceRef = useRef<any>(null);
  const monacoInstanceRef = useRef<any>(null);
  const monaco = useMonaco();

  // disable autocomplete popups for javascript
  useEffect(() => {
    if (monaco) {
      const ts = monaco.languages.typescript as any;
      ts?.javascriptDefaults?.setCompilerOptions({
        noLib: true,
        allowNonTsExtensions: true,
      });
    }
  }, [monaco]);

  const handleEditorDidMount: OnMount = useCallback(
    (editor, monacoInstance) => {
      editorInstanceRef.current = editor;
      monacoInstanceRef.current = monacoInstance;

      editor.onDidBlurEditorWidget(() => {
        props.onBlur && props.onBlur(editor.getValue() || "");
      });
    },
    [props.onBlur],
  );

  // expose getSelectedText via editorRef
  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (editor && props.editorRef) {
      // @ts-ignore
      props.editorRef.current = {
        getSelectedText: () => {
          const selection = editor.getSelection();
          if (selection) {
            return editor.getModel()?.getValueInRange(selection);
          }
        },
      };
    }
  }, [editorInstanceRef.current, props.editorRef]);

  return (
    <AdvancedEditorContainer
      className="AdvancedEditorContainer"
      style={{
        height: props.height,
      }}
    >
      <Editor
        height={props.height}
        language={props.language}
        value={props.value}
        theme={colorMode === "dark" ? "vs-dark" : "light"}
        options={{
          wordWrap: props.wordWrap === true ? "on" : "off",
          ...DEFAULT_OPTIONS,
        }}
        onMount={handleEditorDidMount}
      />
    </AdvancedEditorContainer>
  );
}
