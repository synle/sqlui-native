import React, { useState, useEffect, useCallback } from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import Button from '@mui/material/Button';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import SimpleEditor from 'src/components/CodeEditorBox/SimpleEditor';
import AdvancedEditor from 'src/components/CodeEditorBox/AdvancedEditor';
import { useDarkModeSetting } from 'src/hooks';

let shouldUseSimpleEditor = false;

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

  const onChange = () => {
    props.onChange && props.onChange(value);
  };

  // TODO: will add an option to let user decide which editor to use
  // if(shouldUseSimpleEditor){
  //   return (
  //   <>
  //     <SimpleEditor
  //       className='CodeEditorBox'
  //       value={value}
  //       placeholder={props.placeholder}
  //       onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
  //       onBlur={onChange}
  //       data-language={props.language}
  //       autoFocus={props.autoFocus}
  //       required={props.required}
  //       style={{
  //         whiteSpace: wordWrap ? 'initial' : 'nowrap',
  //       }}
  //     />
  //     <div style={{ textAlign: 'right' }}>
  //       <ToggleButton
  //         value='check'
  //         selected={wordWrap}
  //         onChange={() => setWordWrap(!wordWrap)}
  //         size='small'>
  //         {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
  //         <span style={{ marginLeft: '5px' }}>Wrap</span>
  //       </ToggleButton>
  //     </div>
  //   </>
  // );
  // }

  return (
    <>
      <AdvancedEditor
        language={props.language}
        value={value}
        onChange={(newValue) => setValue(newValue)}
        onBlur={onChange}
      />
    </>
  );
}
