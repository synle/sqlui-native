// @ts-nocheck
import { useState, useEffect, useCallback } from 'react';

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
      } catch (err) {
        // @ts-ignore
      }

      try {
        lineEnd = myField.value.substr(0, endPos).match(/\n/g).length;
      } catch (err) {
        // @ts-ignore
      }

      return [lineStart, lineEnd];
    }
  }, []);

  return <textarea onKeyDown={(e) => onInputKeyDown(e)} {...props}></textarea>;
}
