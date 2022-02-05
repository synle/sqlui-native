import { useRef, useState, useEffect, useCallback } from 'react';
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';

type CodeEditorProps = any & {
  language: 'sql' | '' | string;
}

export default function CodeEditor(props: CodeEditorProps) {
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);

  useEffect(() => {
    if (monacoEl && !editor) {
      setEditor(
        monaco.editor.create(monacoEl.current!, {
          value: props.value,
          language: props.value
        })
      );
    }

    return () => editor?.dispose();
  }, [monacoEl.current]);

  return <div ref={monacoEl} style={{height: '200px', width: '100%'}}></div>;

  return null
}
