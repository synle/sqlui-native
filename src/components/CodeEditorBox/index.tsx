import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Button from '@mui/material/Button';
import ToggleButton from '@mui/material/ToggleButton';
import { useEffect } from 'react';
import { useState } from 'react';
import AdvancedEditor from 'src/components/CodeEditorBox/AdvancedEditor';
import SimpleEditor from 'src/components/CodeEditorBox/SimpleEditor';
import { useEditorModeSetting } from 'src/hooks/useSetting';
import { useWordWrapSetting } from 'src/hooks/useSetting';

type CodeEditorProps = {
  value?: string;
  onChange?: (newValue: string) => void;
  language?: string;
  placeholder?: string;
  mode: 'textarea' | 'code';
  autoFocus?: boolean;
  required?: boolean;
};

export default function CodeEditorBox(props: CodeEditorProps) {
  const globalWordWrap = useWordWrapSetting();
  const [wordWrap, setWordWrap] = useState(false);
  const editorModeToUse = useEditorModeSetting();

  const onChange = (newValue: string) => {
    props.onChange && props.onChange(newValue);
  };

  const contentToggleWordWrap = (
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
  );

  useEffect(() => setWordWrap(globalWordWrap), [globalWordWrap]);

  if (editorModeToUse === 'simple') {
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
        placeholder={props.placeholder}
      />
      {contentToggleWordWrap}
    </>
  );
}
