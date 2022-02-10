import { SqluiCore, SqlAction } from 'typings';
import { formatJS } from 'src/utils/formatter';
import { formatSQL } from 'src/utils/formatter';
import { scripts as RmdbScripts } from 'src/data/sql.rmdb';
import { scripts as CassandraScripts } from 'src/data/sql.cassandra';
import { scripts as MongodbScripts } from 'src/data/sql.mongodb';
import { scripts as RedisScripts } from 'src/data/sql.redis';

type ScriptToUse = (input: SqlAction.TableInput) => SqlAction.Output | undefined;

export function getDivider(): SqlAction.Output {
  return {
    label: 'divider',
  };
}

export function getTableActions(tableActionInput: SqlAction.TableInput) {
  const actions: SqlAction.Output[] = [];

  let scriptsToUse: ScriptToUse[] = [];
  switch (tableActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RmdbScripts;
      break;
    case 'cassandra':
      scriptsToUse = CassandraScripts;
      break;
    case 'mongodb':
      scriptsToUse = MongodbScripts;
      break;
    case 'redis':
      scriptsToUse = RedisScripts;
      break;
  }

  scriptsToUse.forEach((fn) => {
    const action = fn(tableActionInput);
    if (action) {
      switch (action.formatter) {
        case 'sql':
          action.query = formatSQL(action.query || '');
        case 'js':
          action.query = formatJS(action.query || '');
          break;
      }
      actions.push(action);
    }
  });

  return actions;
}
