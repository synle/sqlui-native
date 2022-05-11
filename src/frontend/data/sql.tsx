import SelectAllIcon from '@mui/icons-material/SelectAll';
import {
  getSampleConnectionString as getCassandraSampleConnectionString,
  databaseActionScripts as CassandraDatabaseActionScripts,
  tableActionScripts as CassandraTableActionScripts,
} from 'src/frontend/scripts/cassandra';
import {
  getSampleConnectionString as getAzureCosmosDBSampleConnectionString,
  databaseActionScripts as AzureCosmosDBDatabaseActionScripts,
  tableActionScripts as AzureCosmosDBTableActionScripts,
} from 'src/frontend/scripts/cosmosdb';
import {
  getSampleConnectionString as getMongodbSampleConnectionString,
  databaseActionScripts as MongodbDatabaseActionScripts,
  tableActionScripts as MongodbTableActionScripts,
} from 'src/frontend/scripts/mongodb';
import {
  getSampleConnectionString as getRedisSampleConnectionString,
  databaseActionScripts as RedisDatabaseActionScripts,
  tableActionScripts as RedisTableActionScripts,
} from 'src/frontend/scripts/redis';
import {
  getSampleConnectionString as getRmdbSampleConnectionString,
  databaseActionScripts as RmdbDatabaseActionScripts,
  tableActionScripts as RmdbTableActionScripts,
} from 'src/frontend/scripts/rmdb';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqlAction } from 'typings';

export function getSampleConnectionString(dialect?: string) {
  switch (dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      return getRmdbSampleConnectionString(dialect);
    case 'cassandra':
      return getCassandraSampleConnectionString();
    case 'mongodb':
      return getMongodbSampleConnectionString();
    case 'redis':
      return getRedisSampleConnectionString();
    case 'cosmosdb':
      return getAzureCosmosDBSampleConnectionString();
    default: // Not supported dialect
      return '';
  }
}

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
    case 'cosmosdb':
      scriptsToUse = AzureCosmosDBTableActionScripts;
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
    case 'cosmosdb':
      scriptsToUse = AzureCosmosDBDatabaseActionScripts;
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
