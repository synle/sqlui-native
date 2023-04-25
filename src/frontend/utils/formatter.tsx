import { format as _formatSQL } from 'sql-formatter';

const _formatJS = require('js-beautify').js;

export const formatSQL = (val: string) => {
  try {
    val = _formatSQL(val);
  } catch (err) {
    // if it's not working, let's remove all the leading space
    val = val
      .split('\n')
      .map((s) => s.trim())
      .join('\n');
  }
  return val;
};

export const formatJS = (val: string) => {
  try {
    val = _formatJS(val, {
      indent_size: 2,
      space_in_empty_paren: true,
      break_chained_methods: 2,
    });
  } catch (err) {}

  return val;
};

export const formatDuration = (durationMs: number) => {
  const durationS = Math.floor(durationMs / 1000);
  if (durationS > 1) return `${durationS} seconds`;

  return '<= 1 second';
};

export const escapeSQLValue = (value?: string) => {
  if (value === undefined) {
    value = '';
  }
  return value?.toString().replace(/'/g, `''`);
};

export const isValueNumber = (value: any) => {
  const parsed = parseFloat(value);
  return typeof parsed === 'number' && !isNaN(value);
};

export const isValueBoolean = (value: any) => {
  return (
    value === true ||
    value === false ||
    value.toString().toLowerCase() === 'true' ||
    value.toString().toLowerCase() === 'false'
  );
};