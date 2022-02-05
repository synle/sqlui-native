import { useRef, useState, useEffect, useCallback } from 'react';
import Editor from "@monaco-editor/react";

type CodeEditorProps = any & {
  language: 'sql' | '' | string;
  value: string;
  onChange: (newValue: string) => void;
}

export default function CodeEditor(props: CodeEditorProps) {
  return <Editor
     height="250px"
     defaultLanguage={props.language}
     defaultValue={props.value}
     onChange={(newValue) => props?.onChange(newValue)}
   />
}
