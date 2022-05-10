import SelectAllIcon from '@mui/icons-material/SelectAll';
import {
  databaseActionScripts as CassandraDatabaseActionScripts,
  tableActionScripts as CassandraTableActionScripts,
} from 'src/frontend/scripts/cassandra';
import {
  databaseActionScripts as MongodbDatabaseActionScripts,
  tableActionScripts as MongodbTableActionScripts,
} from 'src/frontend/scripts/mongodb';
import {
  databaseActionScripts as RedisDatabaseActionScripts,
  tableActionScripts as RedisTableActionScripts,
} from 'src/frontend/scripts/redis';
import {
  databaseActionScripts as RmdbDatabaseActionScripts,
  tableActionScripts as RmdbTableActionScripts,
} from 'src/frontend/scripts/rmdb';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqlAction } from 'typings';

export function getTableActions(tableActionInput: SqlAction.TableInput) {
  const actions: SqlAction.Output[] = [];

  let scriptsToUse: SqlAction.TableActionScriptGenerator[] = [];
  switch (tableActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RmdbTableActionScripts;
      break;
    case 'cassandra':
      scriptsToUse = CassandraTableActionScripts;
      break;
    case 'mongodb':
      scriptsToUse = MongodbTableActionScripts;
      break;
    case 'redis':
      scriptsToUse = RedisTableActionScripts;
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
export function getDatabaseActions(databaseActionInput: SqlAction.DatabaseInput) {
  const actions: SqlAction.Output[] = [
    {
      label: 'Select',
      description: `Selected the related database and connection.`,
      icon: <SelectAllIcon />,
    },
  ];

  let scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = [];
  switch (databaseActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RmdbDatabaseActionScripts;
      break;
    case 'cassandra':
      scriptsToUse = CassandraDatabaseActionScripts;
      break;
    case 'mongodb':
      scriptsToUse = MongodbDatabaseActionScripts;
      break;
    case 'redis':
      scriptsToUse = RedisDatabaseActionScripts;
      break;
  }

  scriptsToUse.forEach((fn) => {
    const action = fn(databaseActionInput);
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
