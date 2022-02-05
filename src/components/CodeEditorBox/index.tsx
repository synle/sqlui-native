import React, { useState, useEffect, useCallback } from 'react';
import Editor from "@monaco-editor/react";
import ToggleButton from '@mui/material/ToggleButton';
import Button from '@mui/material/Button';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CodeEditor from 'src/components/CodeEditorBox/CodeEditor';
import {
  useDarkModeSetting,
} from 'src/hooks';

interface CodeEditorProps {
  value?: string;
  onChange?: (newValue: string) => void;
  language?: string;
  placeholder?: string;
  mode: 'textarea' | 'code';
  autoFocus?: boolean;
  required?: boolean;
}

export default function CodeEditorBox(props: CodeEditorProps) {
  const colorMode = useDarkModeSetting();
  const [value, setValue] = useState('');
  const [wordWrap, setWordWrap] = useState(true);

  const onChange = (newValue?: string) => {
    props.onChange && props.onChange(newValue || '');
  };

  useEffect(() => {
    setValue(props?.value || '');
  }, [props.value]);

  return (
    <>
      <Editor
       height="325px"
       defaultLanguage={props.language}
       defaultValue={props.value}
       onChange={(newValue) => onChange(newValue)}
       theme={colorMode === 'dark' ? 'vs-dark': 'light'}
     />
    </>
  );
}
