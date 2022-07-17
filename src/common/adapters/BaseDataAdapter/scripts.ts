import IDataScript from 'src/common/adapters/IDataScript';
import { SqlAction, SqluiCore } from 'typings';

export function getDivider(): SqlAction.Output {
  return {
    label: 'divider',
  };
}

export default abstract class BaseDataScript implements IDataScript {
  dialects: string[] = [];

  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return 'sql';
  }

  supportMigration(){
    return false;
  }

  supportRecordForm(){
    return false;
  }



  //
  getTableScripts(): SqlAction.TableActionScriptGenerator[] {
    return [];
  }
  getDatabaseScripts(): SqlAction.DatabaseActionScriptGenerator[] {
    return [];
  }
  getConnectionScripts(): SqlAction.ConnectionActionScriptGenerator[] {
    return [];
  }
  getSampleConnectionString(dialect?: SqluiCore.Dialect) {
    return '';
  }
}
