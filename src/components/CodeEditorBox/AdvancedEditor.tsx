import { useAsyncDebounce } from 'react-table';
import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/system';
import { useDarkModeSetting } from 'src/hooks/useSetting';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type AdvancedEditorProps = {
  language?: 'sql' | string;
  value?: string;
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  wordWrap?: boolean;
  placeholder?: string;
  onCtrlEnter?: (newValue: string) => void;
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
  automaticLayout: true,
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
      //@ts-ignore
      const newEditor = window.monaco.editor.create(monacoEl.current!, {
        value: props.value,
        language: props.language,
        theme: colorMode === 'dark' ? 'vs-dark' : 'light',
        wordWrap: props.wordWrap === true ? 'on' : 'off',
        ...DEFAULT_OPTIONS,
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
  useEffect(() => {
    //onCtrlEnter
    let keydownHandler = (e: KeyboardEvent) => {
      if (!props.onCtrlEnter || !editor) {
        return;
      }
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();

        try {
          //@ts-ignore
          let textHighlited = editor.getModel().getValueInRange(editor.getSelection());
          let textFromEditor = editor.getValue();
          const newQuery = textHighlited || textFromEditor || '';
          props.onCtrlEnter(newQuery);
        } catch (err) {
          document.removeEventListener('keydown', keydownHandler);
        }
      }
    };

    document.addEventListener('keydown', keydownHandler, true);

    return () => {
      document.removeEventListener('keydown', keydownHandler);
    };
  }, [editor, props.onCtrlEnter]);

  // here we will initiate the editor
  // and can be also be used to update the settings
  useEffect(onSetupMonacoEditor, [monacoEl, props.wordWrap, props.language, colorMode]);

  return <AdvancedEditorContainer ref={monacoEl}></AdvancedEditorContainer>;
}
