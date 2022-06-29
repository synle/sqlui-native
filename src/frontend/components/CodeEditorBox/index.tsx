import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import { useEffect, useState } from 'react';
import AdvancedEditor from 'src/frontend/components/CodeEditorBox/AdvancedEditor';
import SimpleEditor from 'src/frontend/components/CodeEditorBox/SimpleEditor';
import Select from 'src/frontend/components/Select';
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

const DEFAULT_EDITOR_HEIGHT = '20vh';

export default function CodeEditorBox(props: CodeEditorProps) {
  const globalWordWrap = useWordWrapSetting();
  const [wordWrap, setWordWrap] = useState(false);
  const [languageMode, setLanguageMode] = useState<string | undefined>();
  const [height, setHeight] = useState<string>(DEFAULT_EDITOR_HEIGHT);
  const editorModeToUse = useEditorModeSetting();

  const onChange = (newValue: string) => {
    props.onChange && props.onChange(newValue);
  };

  const contentToggleWordWrapSelection = (
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

  const contentLanguageModeSelection = (
    <>
      <Select onChange={(newLanguage) => setLanguageMode(newLanguage)} value={languageMode}>
        <option value=''>Auto Detected ({props.language})</option>
        <option value='javascript'>Javascript</option>
        <option value='sql'>SQL</option>
      </Select>
    </>
  );

  const contentHeightSelection = (
    <>
      <Select onChange={(newHeight) => setHeight(newHeight)} value={height}>
        <option value='20vh'>Small Editor</option>
        <option value='40vh'>Medium Editor</option>
        <option value='60vh'>Large Editor</option>
      </Select>
    </>
  );

  const editorOptionBox = (
    <div className='CodeEditorBox__Commands'>
      {contentToggleWordWrapSelection}
      {contentHeightSelection}
      {contentLanguageModeSelection}
    </div>
  );

  const languageToUse = languageMode || props.language;

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
          height={height}
        />
        {editorOptionBox}
      </div>
    );
  }

  return (
    <Paper className='CodeEditorBox' variant='outlined'>
      <AdvancedEditor
        language={languageToUse}
        value={props.value}
        onBlur={onChange}
        wordWrap={wordWrap}
        placeholder={props.placeholder}
        disabled={props.disabled}
        height={height}
      />
      {editorOptionBox}
    </Paper>
  );
}
