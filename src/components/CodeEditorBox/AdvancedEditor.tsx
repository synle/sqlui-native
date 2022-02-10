import { useAsyncDebounce } from 'react-table';
import { useEffect } from 'react';
import { useRef } from 'react';
import { useState } from 'react';
import { styled } from '@mui/system';
import { useDarkModeSetting } from 'src/hooks';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
type AdvancedEditorProps = {
  language?: 'sql' | string;
  value?: string;
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  wordWrap?: boolean;
};

const AdvancedEditorContainer = styled('div')(({ theme }) => {
  return {
    height: '300px',
    width: '100%',
  };
});

const DEFAULT_OPTIONS = {
  // lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  minimap: {
    enabled: false,
  },
};

export default function AdvancedEditor(props: AdvancedEditorProps) {
  const colorMode = useDarkModeSetting();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const onSetupMonacoEditor = useAsyncDebounce(() => {
    editor?.dispose();

    if (monacoEl.current) {
      const newEditor = monaco.editor.create(monacoEl.current!, {
        value: props.value,
        language: props.language,
        automaticLayout: true,
        minimap: {
          enabled: false,
        },
        theme: colorMode === 'dark' ? 'vs-dark' : 'light',
        wordWrap: props.wordWrap === true ? 'on' : 'off',
      });

      newEditor.onDidBlurEditorWidget(() => {
        props.onBlur && props.onBlur(newEditor.getValue() || '');
      });

      setEditor(newEditor);
    }
  }, 100);

  // this is used to clean up the editor
  useEffect(() => {
    return () => {
      editor?.dispose();
      setEditor(null);
    };
  }, []);

  // we used this block to set the value of the editor
  useEffect(() => {
    if (editor) {
      editor.setValue(props.value || '');
    }
  }, [editor, props.value]);

  // here we will initiate the editor
  // and can be also be used to update the settings
  useEffect(onSetupMonacoEditor, [monacoEl, props.wordWrap, colorMode]);

  return <AdvancedEditorContainer ref={monacoEl}></AdvancedEditorContainer>;
}
