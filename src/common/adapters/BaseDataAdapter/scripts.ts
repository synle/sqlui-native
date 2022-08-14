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

  isDialectSupported(targetDialect?: string) {
    return !!targetDialect && this.dialects.indexOf(targetDialect) >= 0;
  }

  getDialectType(connectionString: string) {
    // attempt to return the first item in the dialects / schemes
    if (this.dialects.length > 0) {
      return this.dialects[0] as SqluiCore.Dialect;
    }

    return undefined;
  }

  getConnectionFormInputs() {
    return [
      ['username', 'Username'],
      ['password', 'Password'],
      ['host', 'Host'],
      ['port', 'Port', 'optional'],
    ];
  }

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

  getDialectName(dialect?: SqluiCore.Dialect): string {
    // capitlize the first letter
    return (dialect || '').replace(/^\w/, (c) => c.toUpperCase());
  }

  getDialectIcon(dialect?: SqluiCore.Dialect): string {
    return `${process.env.PUBLIC_URL}/assets/${dialect}.png`;
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
    switch (language) {
      case 'javascript':
        // TODO: implement me
        return '';
      case 'python':
        // TODO: implement me
        return '';
      case 'java':
        // TODO: implement me
        return '';
      default:
        return '';
    }
  }
}
