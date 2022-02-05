import React, { useState, useEffect, useCallback } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import Button from '@mui/material/Button';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SimpleEditor from 'src/components/CodeEditorBox/SimpleEditor';
import AdvancedEditor from 'src/components/CodeEditorBox/AdvancedEditor';
import { useDarkModeSetting } from 'src/hooks';



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
  const [wordWrap, setWordWrap] = useState(true);
  const onChange = (newValue: string) => {
    props.onChange && props.onChange(newValue);
  };

  // TODO: will add an option to let user decide which editor to use
  let shouldUseSimpleEditor = false;

  const contentToggleWordWrap = <div style={{ textAlign: 'right' }}>
          <ToggleButton
            value='check'
            selected={wordWrap}
            onChange={() => setWordWrap(!wordWrap)}
            size='small'>
            {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
            <span style={{ marginLeft: '5px' }}>Wrap</span>
          </ToggleButton>
        </div>

  if (shouldUseSimpleEditor) {
    return (
      <>
        <SimpleEditor
          value={props.value}
          placeholder={props.placeholder}
          onBlur={onChange}
          autoFocus={props.autoFocus}
          required={props.required}
          wordWrap={wordWrap}
        />
        {contentToggleWordWrap}
      </>
    );
  }

  return (
    <>
      <AdvancedEditor
        language={props.language}
        value={props.value}
        onBlur={onChange}
        wordWrap={wordWrap}
      />
      {contentToggleWordWrap}
    </>
  );
}
