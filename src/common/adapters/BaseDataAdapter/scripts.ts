import IDataScript from 'src/common/adapters/IDataScript';
import { SqlAction, SqluiCore } from 'typings';

export function getDivider(): SqlAction.Output {
  return {
    label: 'divider',
    skipGuide: true,
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

  supportMigration() {
    return false;
  }

  supportCreateRecordForm() {
    return false;
  }

  supportEditRecordForm() {
    return false;
  }

  // sample data script
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

  getSampleSelectQuery(actionInput: SqlAction.TableInput): SqlAction.Output | undefined {
    return undefined;
  }

  // sample code snippet
  getCodeSnippet(
    connection: SqluiCore.ConnectionProps,
    query: SqluiCore.ConnectionQuery,
    language: SqluiCore.LanguageMode,
  ) {
    return '';
  }
}
