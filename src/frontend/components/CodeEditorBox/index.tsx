import CheckBoxIcon from '@mui/icons-material/CheckBox';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import ToggleButton from '@mui/material/ToggleButton';
import React, { useEffect, useMemo, useState } from 'react';
import AdvancedEditor from 'src/frontend/components/CodeEditorBox/AdvancedEditor';
import SimpleEditor from 'src/frontend/components/CodeEditorBox/SimpleEditor';
import InputError from 'src/frontend/components/InputError';
import Select from 'src/frontend/components/Select';
import { useEditorModeSetting, useWordWrapSetting } from 'src/frontend/hooks/useSetting';

export type EditorRef =
  | {
      getSelectedText: () => string | undefined;
    }
  | undefined;

export type CodeEditorProps = {
  id?: string;
  language?: 'sql' | string;
  className?: string;
  value?: string;
  autoFocus?: boolean;
  onChange?: (newValue: string) => void;
  wordWrap?: boolean;
  placeholder?: string;
  disabled?: boolean;
  editorRef?: React.RefObject<EditorRef>;
  required?: boolean;
  height?: string;
};

export type DecoratedEditorProps = CodeEditorProps & {
  onBlur?: (newValue: string) => void;
};

const DEFAULT_EDITOR_HEIGHT = '20vh';

export default function CodeEditorBox(props: CodeEditorProps): JSX.Element | null {
  const globalWordWrap = useWordWrapSetting();
  const [wordWrap, setWordWrap] = useState(false);
  const [languageMode, setLanguageMode] = useState<string | undefined>();
  const [height, setHeight] = useState<string>(props.height || DEFAULT_EDITOR_HEIGHT);
  const editorModeToUse = useEditorModeSetting();

  const onChange = (newValue: string) => {
    props.onChange && props.onChange(newValue);
  };

  const onSetHeight = (newHeight: string) => {
    setHeight(newHeight);
    localStorage.setItem(`editorSize.${props.id}`, newHeight);
  };

  const onSetWrap = (newWordWrap: boolean) => {
    setWordWrap(newWordWrap);
    localStorage.setItem(`editorWrap.${props.id}`, newWordWrap ? '1' : '0');
  };

  const onSetLanguageMode = (newLanguage: string) => {
    setLanguageMode(newLanguage);
    localStorage.setItem(`editorLanguage.${props.id}`, newLanguage);
  };

  const contentToggleWordWrapSelection = (
    <ToggleButton
      value='check'
      selected={wordWrap}
      onChange={() => onSetWrap(!wordWrap)}
      size='small'
      color='primary'>
      {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
      <span style={{ marginLeft: '5px' }}>Wrap</span>
    </ToggleButton>
  );

  const contentLanguageModeSelection = (
    <>
      <Select
        label='Syntax'
        onChange={(newLanguage) => onSetLanguageMode(newLanguage)}
        value={languageMode}>
        <option value=''>Auto Detected ({props.language})</option>
        <option value='javascript'>Javascript</option>
        <option value='sql'>SQL</option>
      </Select>
    </>
  );

  const contentHeightSelection = (
    <>
      <Select label='Editor Size' onChange={(newHeight) => onSetHeight(newHeight)} value={height}>
        <option value='20vh'>Small</option>
        <option value='40vh'>Medium</option>
        <option value='60vh'>Large</option>
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

  const shouldShowRequiredError = useMemo(
    () => !!props.required && !props.value,
    [!!props.required && !props.value],
  );

  useEffect(() => {
    if (props.id) {
      let newHeight = '';
      try {
        newHeight = localStorage.getItem(`editorSize.${props.id}`) || '';
      } catch (err) {}

      if (!newHeight) {
        newHeight = props.height || DEFAULT_EDITOR_HEIGHT;
      }
      onSetHeight(newHeight);

      // set the wrap
      onSetWrap(localStorage.getItem(`editorWrap.${props.id}`) === '1');

      // set the language
      let newLanguage = localStorage.getItem(`editorLanguage.${props.id}`);
      if (newLanguage) {
        onSetLanguageMode(newLanguage);
      }
    }
  }, [props.height, props.id]);

  if (editorModeToUse === 'simple') {
    return (
      <div className={'CodeEditorBox ' + props.className}>
        <SimpleEditor
          id={props.id}
          value={props.value}
          placeholder={props.placeholder}
          onBlur={onChange}
          autoFocus={props.autoFocus}
          required={props.required}
          disabled={props.disabled}
          wordWrap={wordWrap}
          height={height}
          editorRef={props.editorRef}
        />
        {editorOptionBox}
      </div>
    );
  }

  return (
    <Box>
      <Paper className={'CodeEditorBox ' + props.className} variant='outlined'>
        <AdvancedEditor
          id={props.id}
          language={languageToUse}
          value={props.value}
          onBlur={onChange}
          wordWrap={wordWrap}
          placeholder={props.placeholder}
          disabled={props.disabled}
          height={height}
          required={props.required}
          editorRef={props.editorRef}
        />
        {editorOptionBox}
      </Paper>
      {shouldShowRequiredError && <InputError message='This field is required' sx={{ ml: 2 }} />}
    </Box>
  );
}
