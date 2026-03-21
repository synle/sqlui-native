import CheckBoxIcon from "@mui/icons-material/CheckBox";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import ToggleButton from "@mui/material/ToggleButton";
import React, { useEffect, useLayoutEffect, useMemo, useState } from "react";
import AdvancedEditor from "src/frontend/components/CodeEditorBox/AdvancedEditor";
import SimpleEditor from "src/frontend/components/CodeEditorBox/SimpleEditor";
import InputError from "src/frontend/components/InputError";
import Select from "src/frontend/components/Select";
import { useEditorModeSetting, useWordWrapSetting } from "src/frontend/hooks/useSetting";

/** Ref type for accessing editor methods like getting selected text. */
export type EditorRef =
  | {
      getSelectedText: () => string | undefined;
    }
  | undefined;

/** A completion suggestion item for the Monaco editor autocomplete. */
export type CompletionItem = {
  label: string;
  kind: "database" | "table" | "column";
  detail?: string;
};

/** Props for the CodeEditorBox component. */
export type CodeEditorProps = {
  id?: string;
  language?: "sql" | string;
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
  fillHeight?: boolean;

  hideEditorSize?: boolean;
  hideEditorSyntax?: boolean;
  completionItems?: CompletionItem[];
  /** Fires on every content change (debounced) without feeding back into value. */
  onLiveChange?: (newValue: string) => void;
};

/** Extended editor props with blur callback, used by AdvancedEditor and SimpleEditor implementations. */
export type DecoratedEditorProps = CodeEditorProps & {
  onBlur?: (newValue: string) => void;
};

/** Default editor height when no explicit height is provided. */
const DEFAULT_EDITOR_HEIGHT = "30vh";
/** Sentinel value indicating the editor should use full calculated height. */
const FULL_HEIGHT_SENTINEL = "full";
/** Minimum height in pixels when using full height mode. */
const FULL_HEIGHT_MIN_PX = 800;
/** Approximate line height in pixels used for full height calculation. */
const LINE_HEIGHT_PX = 20;

/**
 * Calculates the editor height in pixels based on the number of lines in the value.
 * @param value - The editor content whose line count determines the height.
 * @returns A CSS pixel string (e.g., "800px").
 */
function getFullHeight(value?: string): string {
  const lineCount = (value || "").split("\n").length;
  const calculatedHeight = Math.max(FULL_HEIGHT_MIN_PX, lineCount * LINE_HEIGHT_PX);
  return `${calculatedHeight}px`;
}

/**
 * Code editor component that switches between Monaco (advanced) and textarea (simple) editors
 * based on user settings. Supports configurable height, word wrap, syntax highlighting, and language modes.
 * @param props - Editor configuration including value, language, height, and editor mode options.
 * @returns The rendered code editor with toolbar controls.
 */
export default function CodeEditorBox(props: CodeEditorProps): JSX.Element | null {
  const globalWordWrap = useWordWrapSetting();
  const [wordWrap, setWordWrap] = useState(false);
  const [languageMode, setLanguageMode] = useState<string | undefined>();
  const [heightSetting, setHeightSetting] = useState<string>(props.height || DEFAULT_EDITOR_HEIGHT);
  const editorModeToUse = useEditorModeSetting();

  const height = heightSetting === FULL_HEIGHT_SENTINEL ? getFullHeight(props.value) : heightSetting;

  const hideEditorSize = !!props.hideEditorSize || props.height || false;
  const hideEditorSyntax = !!props.hideEditorSyntax || false;

  const onChange = (newValue: string) => {
    props.onChange && props.onChange(newValue);
  };

  const onSetHeight = (newHeight: string) => {
    setHeightSetting(newHeight);
    localStorage.setItem(`editorSize.${props.id}`, newHeight);
  };

  const onSetWrap = (newWordWrap: boolean) => {
    setWordWrap(newWordWrap);
    localStorage.setItem(`editorWrap.${props.id}`, newWordWrap ? "1" : "0");
  };

  const onSetLanguageMode = (newLanguage: string) => {
    setLanguageMode(newLanguage);
    localStorage.setItem(`editorLanguage.${props.id}`, newLanguage);
  };

  const contentToggleWordWrapSelection = (
    <ToggleButton value="check" selected={wordWrap} onChange={() => onSetWrap(!wordWrap)} size="small" color="primary">
      {wordWrap ? <CheckBoxIcon /> : <CheckBoxOutlineBlankIcon />}
      <span style={{ marginLeft: "5px" }}>Wrap</span>
    </ToggleButton>
  );

  const contentLanguageModeSelection = !hideEditorSyntax && (
    <>
      <Select label="Syntax" onChange={(newLanguage) => onSetLanguageMode(newLanguage)} value={languageMode}>
        <option value="">Auto Detected ({props.language})</option>
        <option value="javascript">Javascript</option>
        <option value="sql">SQL</option>
      </Select>
    </>
  );

  const contentHeightSelection = !hideEditorSize && (
    <>
      <Select label="Editor Size" onChange={(newHeight) => onSetHeight(newHeight)} value={heightSetting}>
        <option value={DEFAULT_EDITOR_HEIGHT}>Small</option>
        <option value="45vh">Medium</option>
        <option value={FULL_HEIGHT_SENTINEL}>Full</option>
      </Select>
    </>
  );

  const editorOptionBox = (
    <div className="CodeEditorBox__Commands">
      {contentToggleWordWrapSelection}
      {contentHeightSelection}
      {contentLanguageModeSelection}
    </div>
  );

  const languageToUse = languageMode || props.language;

  useEffect(() => setWordWrap(!!props.wordWrap || globalWordWrap), [globalWordWrap]);

  const shouldShowRequiredError = useMemo(() => !!props.required && !props.value, [!!props.required && !props.value]);

  useLayoutEffect(() => {
    if (props.id) {
      let newHeight = "";
      try {
        newHeight = localStorage.getItem(`editorSize.${props.id}`) || "";
      } catch (err) {
        console.error("index.tsx:getItem", err);
      }

      if (!newHeight) {
        newHeight = props.height || DEFAULT_EDITOR_HEIGHT;
      }
      setHeightSetting(newHeight);

      // set the wrap
      onSetWrap(localStorage.getItem(`editorWrap.${props.id}`) === "1");

      // set the language
      const newLanguage = localStorage.getItem(`editorLanguage.${props.id}`);
      if (newLanguage) {
        onSetLanguageMode(newLanguage);
      }
    }
  }, [props.height, props.id]);

  const fillHeightStyle = props.fillHeight ? { display: "flex", flexDirection: "column" as const, flex: 1, minHeight: 0 } : undefined;

  const editorHeight = props.fillHeight ? undefined : height;

  if (editorModeToUse === "simple") {
    return (
      <div className={"CodeEditorBox " + props.className} style={fillHeightStyle}>
        <SimpleEditor
          id={props.id}
          value={props.value}
          placeholder={props.placeholder}
          onBlur={onChange}
          onLiveChange={props.onLiveChange}
          autoFocus={props.autoFocus}
          required={props.required}
          disabled={props.disabled}
          wordWrap={wordWrap}
          height={editorHeight}
          fillHeight={props.fillHeight}
          editorRef={props.editorRef}
        />
        {editorOptionBox}
      </div>
    );
  }

  return (
    <Box sx={props.fillHeight ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : undefined}>
      <Paper
        className={"CodeEditorBox " + props.className}
        variant="outlined"
        sx={props.fillHeight ? { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 } : undefined}
      >
        <AdvancedEditor
          id={props.id}
          language={languageToUse}
          value={props.value}
          onBlur={onChange}
          onLiveChange={props.onLiveChange}
          wordWrap={wordWrap}
          placeholder={props.placeholder}
          disabled={props.disabled}
          height={editorHeight}
          fillHeight={props.fillHeight}
          required={props.required}
          editorRef={props.editorRef}
          completionItems={props.completionItems}
        />
        {editorOptionBox}
      </Paper>
      {shouldShowRequiredError && <InputError message="This field is required" sx={{ ml: 2 }} />}
    </Box>
  );
}
