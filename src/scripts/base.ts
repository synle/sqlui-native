import { SqluiCore, SqlAction } from 'typings';

export function getDivider(): SqlAction.Output {
  return {
    label: 'divider',
  };
}
