import { format as _formatSQL } from 'sql-formatter';
const _formatJS = require('js-beautify').js;

export const formatSQL = _formatSQL;
export const formatJS = (val: string) => _formatJS(val, {
          indent_size: 2,
          space_in_empty_paren: true,
          break_chained_methods: 2,
        });
