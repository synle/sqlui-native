import { useState, useEffect } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import ToggleButton from '@mui/material/ToggleButton';
import Button from '@mui/material/Button';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';

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
  const [wordWrap, setWordWrap] = useState(false);

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
      <textarea
        className='CodeEditorBox'
        value={value}
        placeholder={props.placeholder}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => onChange(e.target.value)}
        data-language={props.language}
        autoFocus={props.autoFocus}
        required={props.required}
        style={{
          backgroundColor: '#f5f5f5',
          border: 'none',
          fontFamily: 'monospace',
          fontWeight: '700',
          width: '100%',
          minHeight: '200px',
          color: '#888',
          padding: '10px',
          resize: 'vertical',
          whiteSpace: wordWrap ? 'nowrap' : 'initial',
        }}
      />
      <div style={{ textAlign: 'right' }}>
        <ToggleButton value='check' selected={wordWrap} onChange={() => setWordWrap(!wordWrap)} size='small'>
          {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
          <span style={{ marginLeft: '5px' }}>Word Wrap</span>
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
