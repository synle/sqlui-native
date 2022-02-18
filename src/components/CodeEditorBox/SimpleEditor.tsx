// @ts-nocheck
import { grey } from '@mui/material/colors';
import { useCallback, useEffect, useState } from 'react';
import { styled } from '@mui/system';

const StyledTextArea = styled('textarea')(({ theme }) => {
  let backgroundColor, color;

  if(theme.palette.mode === 'light'){
    backgroundColor = grey[100];
  } else {
    backgroundColor = grey[800];
  }

  color = theme.palette.getContrastText(backgroundColor);

  return {
    backgroundColor,
    color,
    border: '2px solid transparent',
    fontFamily: 'monospace',
    fontWeight: '700',
    width: '100%',
    minHeight: '300px',
    padding: '10px',
    resize: 'vertical',
    outline: 'none',
    '&:hover, &:focus': {
      borderColor: theme.palette.primary.main,
    },
  };
});

export default function SchemaEditor(props) {
  const onInputKeyDown = useCallback((e) => {
    const TAB_INDENT = '  ';
    switch (e.key) {
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey === true) {
          _deleteIndentAtCursor(e.target, TAB_INDENT.length);
        } else {
          _insertIndentAtCursor(e.target, TAB_INDENT);
        }
        break;
      case 'Enter':
        // attempted to persist the last row indentation
        e.preventDefault();
        _persistTabIndent(e.target);
        break;
    }

    function _insertIndentAtCursor(myField, myValue) {
      let startPos = myField.selectionStart;
      let endPos = myField.selectionEnd;

      if (startPos === endPos) {
        // single line indentation
        myField.value =
          myField.value.substring(0, startPos) + myValue + myField.value.substring(endPos);
        myField.setSelectionRange(startPos + myValue.length, endPos + myValue.length);
      } else {
        // multiple line indentation
        const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);

        // calculate where we should put the cursor
        const [res, newStartPos, newEndPos] = _iterateOverRows(
          myField.value.split('\n'),
          lineStart,
          lineEnd,
          (row) => myValue + row,
        );
        myField.value = res;
        myField.setSelectionRange(newStartPos, newEndPos);
      }
    }

    function _deleteIndentAtCursor(myField, length) {
      let startPos = myField.selectionStart;
      let endPos = myField.selectionEnd;

      if (startPos === endPos) {
        myField.value = myField.value.substring(0, startPos - 2) + myField.value.substring(endPos);
        myField.setSelectionRange(startPos - length, endPos - length);
      } else {
        const [lineStart, lineEnd] = _getLineStartEnd(myField, startPos, endPos);

        const [res, newStartPos, newEndPos] = _iterateOverRows(
          myField.value.split('\n'),
          lineStart,
          lineEnd,
          (row) => {
            for (let i = 0; i < row.length; i++) {
              if (row[i] !== ' ' || i === length) {
                return row.substr(i);
              }
            }
            return row;
          },
        );

        myField.value = res;
        myField.setSelectionRange(newStartPos, newEndPos);
      }
    }

    function _persistTabIndent(myField) {
      try {
        const rows = myField.value.substr(0, myField.selectionStart).split('\n');
        const lastRow = rows[rows.length - 1];
        const lastRowIndent = lastRow.match(/^[ ]+/)[0];

        _insertIndentAtCursor(e.target, '\n' + lastRowIndent);
      } catch (err) {
        _insertIndentAtCursor(e.target, '\n');
      }
    }

    function _iterateOverRows(rows, lineStart, lineEnd, func) {
      let newStartPos;
      let newEndPos;
      let curCharCount = 0;

      func =
        func ||
        function (row) {
          return row;
        };

      const res = [];
      for (let i = 0; i < rows.length; i++) {
        let row = rows[i];

        if (i >= lineStart && i <= lineEnd) {
          row = func(row);
        }

        if (i === lineStart) {
          newStartPos = curCharCount;
        }

        if (i === lineEnd) {
          newEndPos = curCharCount + row.length;
        }

        curCharCount += row.length + 1;

        res.push(row);
      }

      return [res.join('\n'), newStartPos, newEndPos];
    }

    function _getLineStartEnd(myField, startPos, endPos) {
      let lineStart = 0,
        lineEnd = 0;
      try {
        lineStart = myField.value.substr(0, startPos).match(/\n/g).length;
      } catch (err) {}

      try {
        lineEnd = myField.value.substr(0, endPos).match(/\n/g).length;
      } catch (err) {}

      return [lineStart, lineEnd];
    }
  }, []);

  const { value, ...restProps } = props;
  const [text, setText] = useState(value);

  const onInputChange = (e) => setText(e.target.value);

  const onInputBlur = (e) => {
    props.onBlur && props.onBlur(e.target.value);
  };

  useEffect(() => setText(value), [value]);

  return (
    <StyledTextArea
      className='SimpleEditorContainer'
      value={text}
      onKeyDown={onInputKeyDown}
      onChange={onInputChange}
      onBlur={onInputBlur}
      placeholder={props.placeholder}
      autoFocus={props.autoFocus}
      required={props.required}
      style={{
        whiteSpace: props.wordWrap ? 'initial' : 'nowrap',
      }}
    />
  );
}
