import * as monaco from 'monaco-editor/esm/vs/editor/editor.api';
import { useAsyncDebounce } from 'react-table';
import { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/system';
import { useDarkModeSetting } from 'src/frontend/hooks/useSetting';

type AdvancedEditorProps = {
  language?: 'sql' | string;
  value?: string;
  onChange?: (newValue: string) => void;
  onBlur?: (newValue: string) => void;
  wordWrap?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

const AdvancedEditorContainer = styled('div')(({ theme }) => {
  return {
    height: '300px',
    width: '100%',
  };
});

const DEFAULT_OPTIONS = {
  // lineNumbers: 'off',
  glyphMargin: false,
  folding: false,
  automaticLayout: true,
  minimap: {
    enabled: false,
  },
};

export default function AdvancedEditor(props: AdvancedEditorProps) {
  const colorMode = useDarkModeSetting();
  const [editor, setEditor] = useState<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoEl = useRef(null);
  const onSetupMonacoEditor = useAsyncDebounce(() => {
    editor?.dispose();

    if (monacoEl.current) {
      //@ts-ignore
      const newEditor = window.monaco.editor.create(monacoEl.current!, {
        value: props.value,
        language: props.language,
        theme: colorMode === 'dark' ? 'vs-dark' : 'light',
        wordWrap: props.wordWrap === true ? 'on' : 'off',
        ...DEFAULT_OPTIONS,
      });

      newEditor.onDidBlurEditorWidget(() => {
        props.onBlur && props.onBlur(newEditor.getValue() || '');
      });

      setEditor(newEditor);
    }
  }, 100);

  // this is used to clean up the editor
  useEffect(() => {
    return () => {
      editor?.dispose();
      setEditor(null);
    };
  }, []);

  // we used this block to set the value of the editor
  useEffect(() => {
    if (editor) {
      const newValue = props.value || '';

      // https://stackoverflow.com/questions/60965171/not-able-to-do-undo-in-monaco-editor
      // NOTE we can't do setValue here because it will wipe out the undo stack
      // Select all text
      const fullRange = editor.getModel()?.getFullModelRange();

      if (fullRange !== undefined) {
        // Apply the text over the range
        editor.executeEdits(null, [
          {
            text: newValue,
            range: fullRange,
          },
        ]);

        // Indicates the above edit is a complete undo/redo change.
        editor.pushUndoStop();
      } else {
        // fall back to use setValue if we can't find the range
        editor.setValue(newValue);
      }
    }
  }, [editor, props.value]);

  // here we will initiate the editor
  // and can be also be used to update the settings
  useEffect(onSetupMonacoEditor, [monacoEl, props.wordWrap, props.language, colorMode]);

  return (
    <div>
      <AdvancedEditorContainer
      className='AdvancedEditorContainer'
      ref={monacoEl}></AdvancedEditorContainer>
      <Resizer onSetHeight={console.log} />
    </div>
  );
}

////////////////////////////////////////////////////////////
const StyledResizer = styled('div')(({ theme }) => {
  const backgroundColor = theme.palette.action.focus;

  return {
    height: '10px',
    cursor: 'resize',
    background: '#eee',
    '&:hover': {
      background: theme.palette.action.focus,
    },
  };
});

// move this into a file
type ResizerProps = {
  onSetHeight: (newWidth: number) => void;
};

const DRAG_GHOST_ID = 'drag-ghost';

export function Resizer(props: ResizerProps) {
  const onDragStart = (e: React.DragEvent) => {
    const dragGhostElem = document.createElement('div');
    dragGhostElem.id = DRAG_GHOST_ID;
    // dragGhostElem.classList.add('LayoutTwoColumns__LeftPane__DragGhost');
    // dragGhostElem.style.width = e.clientX + 'px';

    document.body.appendChild(dragGhostElem);
  };

  const onDragEnd = (e: React.MouseEvent) => {
    props.onSetHeight(e.clientY);
    document.querySelector(`#${DRAG_GHOST_ID}`)?.remove();
  };

  const onDrag = (e: React.MouseEvent) => {
    const dragGhostElem = document.querySelector(`#${DRAG_GHOST_ID}`);
    const endX = e.clientY;
    //@ts-ignore
    dragGhostElem.style.height = e.clientY + 'px';

    console.log(e.clientY, e)
  };

  return (
    <StyledResizer
      draggable={true}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDrag={onDrag}
    />
  );
}
