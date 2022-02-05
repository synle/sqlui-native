import { useRef, useState, useEffect, useCallback } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useDarkModeSetting } from 'src/hooks';

type AdvancedEditorProps = {
  language?: 'sql' | string;
  value: string;
  onChange?: (newValue: string) => void;
  onBlur?: () => void;
};

export default function AdvancedEditor(props: AdvancedEditorProps) {
  const monaco = useMonaco();
  const colorMode = useDarkModeSetting();

  useEffect(() => {
    if (monaco) {
      console.log('here is the monaco isntance:', monaco);
      debugger;
      // monaco.editor.onDidBlurEditorWidget(()=>{
      //      console.log("Blur event triggerd !")
      // })
    }
  }, [monaco]);

  const onChange = (newValue?: string) => {
    console.log('onChange advanced', newValue)
    props.onChange && props.onChange(newValue || '');
  };

  return (
    <>
      <Editor
        height='300px'
        language={props.language}
        value={props.value}
        onChange={(newValue) => onChange(newValue || '')}
        theme={colorMode === 'dark' ? 'vs-dark' : 'light'}
        options={{
          // lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          minimap: {
            enabled: false,
          },
        }}
      />
      {props.value}
    </>
  );
}
