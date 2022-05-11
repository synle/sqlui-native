import SelectAllIcon from '@mui/icons-material/SelectAll';
import {
  databaseActionScripts as AzureCosmosDBDatabaseActionScripts,
  getSampleConnectionString as getAzureCosmosDBSampleConnectionString,
  tableActionScripts as AzureCosmosDBTableActionScripts,
} from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import {
  databaseActionScripts as CassandraDatabaseActionScripts,
  getSampleConnectionString as getCassandraSampleConnectionString,
  tableActionScripts as CassandraTableActionScripts,
} from 'src/common/adapters/CassandraDataAdapter/scripts';
import {
  databaseActionScripts as MongodbDatabaseActionScripts,
  getSampleConnectionString as getMongodbSampleConnectionString,
  tableActionScripts as MongodbTableActionScripts,
} from 'src/common/adapters/MongoDBDataAdapter/scripts';
import {
  databaseActionScripts as RedisDatabaseActionScripts,
  getSampleConnectionString as getRedisSampleConnectionString,
  tableActionScripts as RedisTableActionScripts,
} from 'src/common/adapters/RedisDataAdapter/scripts';
import {
  databaseActionScripts as RmdbDatabaseActionScripts,
  getSampleConnectionString as getRmdbSampleConnectionString,
  tableActionScripts as RmdbTableActionScripts,
} from 'src/common/adapters/RelationalDataAdapter/scripts';
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
