import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import ToggleButton from '@mui/material/ToggleButton';
import { useEffect, useState } from 'react';
import AdvancedEditor from 'src/components/CodeEditorBox/AdvancedEditor';
import SimpleEditor from 'src/components/CodeEditorBox/SimpleEditor';
import { useEditorModeSetting, useWordWrapSetting } from 'src/hooks/useSetting';

type CodeEditorProps = {
  value?: string;
  onChange?: (newValue: string) => void;
  onCtrlEnter?: (newValue: string) => void;
  language?: string;
  placeholder?: string;
  mode: 'textarea' | 'code';
  autoFocus?: boolean;
  required?: boolean;
  wordWrap?: boolean;
};

export default function CodeEditorBox(props: CodeEditorProps) {
  const globalWordWrap = useWordWrapSetting();
  const [wordWrap, setWordWrap] = useState(false);
  const editorModeToUse = useEditorModeSetting();

  const onChange = (newValue: string) => {
    props.onChange && props.onChange(newValue);
  };

  const contentToggleWordWrap = (
    <ToggleButton
      className='CodeEditorBox__WordWrap'
      value='check'
      selected={wordWrap}
      onChange={() => setWordWrap(!wordWrap)}
      size='small'>
      {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
      <span style={{ marginLeft: '5px' }}>Wrap</span>
    </ToggleButton>
  );

  useEffect(() => setWordWrap(!!props.wordWrap || globalWordWrap), [globalWordWrap]);

  if (editorModeToUse === 'simple') {
    return (
      <div className='CodeEditorBox'>
        <SimpleEditor
          value={props.value}
          placeholder={props.placeholder}
          onBlur={onChange}
          autoFocus={props.autoFocus}
          required={props.required}
          wordWrap={wordWrap}
          onCtrlEnter={props.onCtrlEnter}
        />
        {contentToggleWordWrap}
      </div>
    );
  }

  return (
    <div className='CodeEditorBox'>
      <AdvancedEditor
        language={props.language}
        value={props.value}
        onBlur={onChange}
        wordWrap={wordWrap}
        placeholder={props.placeholder}
        onCtrlEnter={props.onCtrlEnter}
      />
      {contentToggleWordWrap}
    </div>
  );
}