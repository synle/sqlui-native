import {scripts as MongodbScripts} from 'src/scripts/mongodb';
import {scripts as RedisScripts} from 'src/scripts/redis';
import {formatJS} from 'src/utils/formatter';
import {formatSQL} from 'src/utils/formatter';
import {scripts as CassandraScripts} from 'src/scripts/cassandra';
import {scripts as RmdbScripts} from 'src/scripts/rmdb';
import {SqlAction} from 'typings';

export function getTableActions(tableActionInput: SqlAction.TableInput) {
  const actions: SqlAction.Output[] = [];

  let scriptsToUse: SqlAction.ScriptGenerator[] = [];
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
          break;
        case 'js':
          action.query = formatJS(action.query || '');
          break;
      }
      actions.push(action);
    }
  });

  return actions;
}