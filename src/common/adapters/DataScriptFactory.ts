import {
  connectionActionScripts as AzureCosmosDBConnectionActionScripts,
  databaseActionScripts as AzureCosmosDBDatabaseActionScripts,
  getSampleConnectionString as getAzureCosmosDBSampleConnectionString,
  tableActionScripts as AzureCosmosDBTableActionScripts,
} from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import {
  connectionActionScripts as AzureTableConnectionActionScripts,
  databaseActionScripts as AzureTableDatabaseActionScripts,
  getSampleConnectionString as getAzureTableSampleConnectionString,
  tableActionScripts as AzureTableTableActionScripts,
} from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import {
  connectionActionScripts as CassandraConnectionActionScripts,
  databaseActionScripts as CassandraDatabaseActionScripts,
  getSampleConnectionString as getCassandraSampleConnectionString,
  tableActionScripts as CassandraTableActionScripts,
} from 'src/common/adapters/CassandraDataAdapter/scripts';
import {
  connectionActionScripts as MongodbConnectionActionScripts,
  databaseActionScripts as MongodbDatabaseActionScripts,
  getSampleConnectionString as getMongodbSampleConnectionString,
  tableActionScripts as MongodbTableActionScripts,
} from 'src/common/adapters/MongoDBDataAdapter/scripts';
import {
  connectionActionScripts as RedisConnectionActionScripts,
  databaseActionScripts as RedisDatabaseActionScripts,
  getSampleConnectionString as getRedisSampleConnectionString,
  tableActionScripts as RedisTableActionScripts,
} from 'src/common/adapters/RedisDataAdapter/scripts';
import {
  connectionActionScripts as RdbmsConnectionActionScripts,
  databaseActionScripts as RdbmsDatabaseActionScripts,
  getSampleConnectionString as getRdbmsSampleConnectionString,
  tableActionScripts as RdbmsTableActionScripts,
} from 'src/common/adapters/RelationalDataAdapter/scripts';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqlAction } from 'typings';
function _formatScripts(
  actionInput: SqlAction.TableInput | SqlAction.DatabaseInput | SqlAction.ConnectionInput,
  generatorFuncs:
    | SqlAction.TableActionScriptGenerator[]
    | SqlAction.DatabaseActionScriptGenerator[],
) {
  const actions: SqlAction.Output[] = [];

  for (const fn of generatorFuncs) {
    //@ts-ignore
    const action = fn(actionInput);
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
  }

  return actions;
}

/**
 * @type {Array} ordered list of supported dialects is shown in the connection hints
 */
export const SUPPORTED_DIALECTS = [
  'mysql',
  'mariadb',
  'mssql',
  'postgres',
  'sqlite',
  'cassandra',
  'mongodb',
  'redis',
  'cosmosdb',
  'aztable',
];

export function getIsTableIdRequiredForQuery(dialect?: string) {
  switch (dialect) {
    default:
      return false;
    case 'aztable':
    case 'cosmosdb':
      return true;
  }
}

export function getSyntaxModeByDialect(dialect?: string): 'javascript' | 'sql' {
  switch (dialect) {
    default:
      return 'sql';
    case 'mongodb':
    case 'redis':
    case 'cosmosdb':
    case 'aztable':
      return 'javascript';
  }
}

export function getSampleConnectionString(dialect?: string) {
  switch (dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      return getRdbmsSampleConnectionString(dialect);
    case 'cassandra':
      return getCassandraSampleConnectionString();
    case 'mongodb':
      return getMongodbSampleConnectionString();
    case 'redis':
      return getRedisSampleConnectionString();
    case 'cosmosdb':
      return getAzureCosmosDBSampleConnectionString();
    case 'aztable':
      return getAzureTableSampleConnectionString();
    default: // Not supported dialect
      return '';
  }
}

export function getTableActions(tableActionInput: SqlAction.TableInput) {
  let scriptsToUse: SqlAction.TableActionScriptGenerator[] = [];
  switch (tableActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RdbmsTableActionScripts;
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
    case 'aztable':
      scriptsToUse = AzureTableTableActionScripts;
      break;
  }

  return _formatScripts(tableActionInput, scriptsToUse);
}

export function getSampleSelectQuery(tableActionInput: SqlAction.TableInput) {
  let scriptsToUse: SqlAction.TableActionScriptGenerator[] = [];
  switch (tableActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RdbmsTableActionScripts;
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
    case 'aztable':
      scriptsToUse = AzureTableTableActionScripts;
      break;
  }

  return _formatScripts(tableActionInput, scriptsToUse).filter((script) =>
    script.label.includes('Select'),
  )[0];
}

export function getDatabaseActions(databaseActionInput: SqlAction.DatabaseInput) {
  let scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = [];
  switch (databaseActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RdbmsDatabaseActionScripts;
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
    case 'aztable':
      scriptsToUse = AzureTableDatabaseActionScripts;
      break;
  }

  return _formatScripts(databaseActionInput, scriptsToUse);
}

export function getConnectionActions(connectionActionInput: SqlAction.ConnectionInput) {
  let scriptsToUse: SqlAction.DatabaseActionScriptGenerator[] = [];
  switch (connectionActionInput.dialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      scriptsToUse = RdbmsConnectionActionScripts;
      break;
    case 'cassandra':
      scriptsToUse = CassandraConnectionActionScripts;
      break;
    case 'mongodb':
      scriptsToUse = MongodbConnectionActionScripts;
      break;
    case 'redis':
      scriptsToUse = RedisConnectionActionScripts;
      break;
    case 'cosmosdb':
      scriptsToUse = AzureCosmosDBConnectionActionScripts;
      break;
    case 'aztable':
      scriptsToUse = AzureTableConnectionActionScripts;
      break;
  }

  return _formatScripts(connectionActionInput, scriptsToUse);
}
