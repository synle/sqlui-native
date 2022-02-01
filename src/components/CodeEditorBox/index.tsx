import React, { useState, useEffect, useCallback } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import ToggleButton from '@mui/material/ToggleButton';
import Button from '@mui/material/Button';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { grey } from '@mui/material/colors';
import SchemaEditor from 'src/components/CodeEditorBox/SchemaEditor';

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
  const [value, setValue] = useState('');
  const [wordWrap, setWordWrap] = useState(true);

  const onChange = (newValue: string) => {
    if (newValue !== props.value) {
      props.onChange && props.onChange(newValue);
    }
  };

  useEffect(() => {
    setValue(props?.value || '');
  }, [props.value]);

  return (
    <>
      <SchemaEditor
        className='CodeEditorBox'
        value={value}
        placeholder={props.placeholder}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
        onBlur={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        data-language={props.language}
        autoFocus={props.autoFocus}
        required={props.required}
        style={{
          whiteSpace: wordWrap ? 'initial' : 'nowrap',
        }}
      />
      <div style={{ textAlign: 'right' }}>
        <ToggleButton
          value='check'
          selected={wordWrap}
          onChange={() => setWordWrap(!wordWrap)}
          size='small'>
          {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
          <span style={{ marginLeft: '5px' }}>Wrap</span>
        </ToggleButton>
      </div>
    </>
  );

  // <CodeEditor
  //              value={value}
  //              onChange={(e) => setValue(e.target.value)}
  //              language='json'
  //              style={{
  //                backgroundColor: '#f5f5f5',
  //                border: 'none',
  //                fontFamily: 'monospace',
  //                width: '100%',
  //                minHeight: '400px',
  //                padding: '10px',
  //              }}
  //              autoFocus
  //              required
  //            />
}
