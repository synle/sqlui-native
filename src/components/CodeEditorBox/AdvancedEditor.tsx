import { useRef, useState, useEffect, useCallback } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { styled, createTheme, ThemeProvider } from '@mui/system';
import { useDarkModeSetting } from 'src/hooks';

type AdvancedEditorProps = {
  language?: 'sql' | string;
  value: string;
  onChange?: (newValue: string) => void;
  onBlur?: () => void;
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
  const theme = colorMode === 'dark' ? 'vs-dark' : 'light';

  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  useEffect(() => {
    if (monacoEl && !editor) {
      const newEditor = monaco.editor.create(monacoEl.current!, {
          language: 'sql',
          glyphMargin: false,
  folding: false,
  minimap: {
    enabled: false,
  },
        })

      newEditor.onDidBlurEditorWidget(()=>{
           console.log("Blur event triggerd !", newEditor.getValue())
      })

      setEditor(
        monaco.editor.create(monacoEl.current!, {
          language: 'sql',
        }),
      );

    }

    return () => {
      editor?.dispose();
    };
  }, [monacoEl.current]);

  useEffect(() => {
    if(editor){
      console.log('Set', props.value)
      editor.setValue(props.value || '');
    }
  }, [editor, props.value]);

  return <div ref={monacoEl} style={{height: '300px'}}></div>;
}
