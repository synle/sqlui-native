import { SqlAction } from 'typings';
import IDataScript from 'src/common/adapters/IDataScript';

export function getDivider(): SqlAction.Output {
  return {
    label: 'divider',
  };
}

export default abstract class BaseDataScript implements IDataScript{
  getTableScripts  () : SqlAction.TableActionScriptGenerator[]{
    return [];
  }
  getDatabaseScripts  () : SqlAction.DatabaseActionScriptGenerator[]{
    return [];
  }
  getConnectionScripts  () : SqlAction.ConnectionActionScriptGenerator[]{
    return [];
  }
  getSampleConnectionString () {
    return ''
  }
}
