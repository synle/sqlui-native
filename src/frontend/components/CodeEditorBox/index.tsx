import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import Button from '@mui/material/Button';
import { useEffect, useState } from 'react';
import AdvancedEditor from 'src/frontend/components/CodeEditorBox/AdvancedEditor';
import SimpleEditor from 'src/frontend/components/CodeEditorBox/SimpleEditor';
import { useEditorModeSetting, useWordWrapSetting } from 'src/frontend/hooks/useSetting';

type CodeEditorProps = {
  value?: string;
  onChange?: (newValue: string) => void;
  language?: string;
  placeholder?: string;
  autoFocus?: boolean;
  required?: boolean;
  wordWrap?: boolean;
  disabled?: boolean;
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
      value='check'
      selected={wordWrap}
      onChange={() => setWordWrap(!wordWrap)}
      size='small'
      color='primary'>
      {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
      <span style={{ marginLeft: '5px' }}>Wrap</span>
    </ToggleButton>
  );

  const contentLanguageMode = (
    <Button
      value='check'
      onChange={() => setWordWrap(!wordWrap)}
      size='small'
      color='primary'>
      <span style={{ marginLeft: '5px' }}>Wrap</span>
    </Button>
  );


  const editorOptionBox = <div className='CodeEditorBox__Commands'>
        {contentToggleWordWrap}
        {contentLanguageMode}
        </div>;

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
          disabled={props.disabled}
          wordWrap={wordWrap}
        />
        {editorOptionBox}
      </div>
    );
  }

  return (
    <Paper className='CodeEditorBox' variant='outlined'>
      <AdvancedEditor
        language={props.language}
        value={props.value}
        onBlur={onChange}
        wordWrap={wordWrap}
        placeholder={props.placeholder}
        disabled={props.disabled}
      />
      {editorOptionBox}
    </Paper>
  );
}
