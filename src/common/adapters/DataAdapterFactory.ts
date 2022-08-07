import AzureCosmosDataAdapter from 'src/common/adapters/AzureCosmosDataAdapter/index';
import AzureTableStorageAdapter from 'src/common/adapters/AzureTableStorageAdapter/index';
import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import CassandraDataAdapter from 'src/common/adapters/CassandraDataAdapter/index';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import MongoDBDataAdapter from 'src/common/adapters/MongoDBDataAdapter/index';
import RedisDataAdapter from 'src/common/adapters/RedisDataAdapter/index';
import RelationalDataAdapter from 'src/common/adapters/RelationalDataAdapter/index';
import AzureCosmosDataAdapterScripts from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import AzureTableStorageAdapterScripts from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import BaseDataScript from 'src/common/adapters/BaseDataAdapter/scripts';
import CassandraDataAdapterScripts from 'src/common/adapters/CassandraDataAdapter/scripts';
import MongoDBDataAdapterScripts from 'src/common/adapters/MongoDBDataAdapter/scripts';
import RedisDataAdapterScripts from 'src/common/adapters/RedisDataAdapter/scripts';
import RelationalDataAdapterScripts from 'src/common/adapters/RelationalDataAdapter/scripts';
import PersistentStorage from 'src/common/PersistentStorage';
import { SqluiCore } from 'typings';

const _adapterCache: { [index: string]: IDataAdapter } = {};

export function getDataAdapter(connection: string) {
  if (_adapterCache[connection]) {
    return _adapterCache[connection];
  }

  // TOOD: here we should initialize the connection based on type
  // of the connection string
  let adapter: IDataAdapter | undefined;
  const targetDialect = BaseDataAdapter.getDialect(connection);

  if(RelationalDataAdapterScripts.isDialectSupported(targetDialect))
  {
    adapter = new RelationalDataAdapter(connection);
  }
  if(CassandraDataAdapterScripts.isDialectSupported(targetDialect))
  {
    adapter = new CassandraDataAdapter(connection);
  }
  if(MongoDBDataAdapterScripts.isDialectSupported(targetDialect))
  {
    adapter = new MongoDBDataAdapter(connection);
  }
  if(RedisDataAdapterScripts.isDialectSupported(targetDialect))
  {
    adapter = new RedisDataAdapter(connection);
  }
  if(AzureCosmosDataAdapterScripts.isDialectSupported(targetDialect))
  {
    adapter = new AzureCosmosDataAdapter(connection);
  }
  if(AzureTableStorageAdapterScripts.isDialectSupported(targetDialect))
  {
    adapter = new AzureTableStorageAdapter(connection);
  }

  if(!adapter){
    throw 'dialect not supported';
  }

  _adapterCache[connection] = adapter;
  return adapter;
}

export async function getConnectionMetaData(connection: SqluiCore.CoreConnectionProps) {
  const connItem: SqluiCore.CoreConnectionMetaData = {
    name: connection.name,
    id: connection?.id,
    connection: connection.connection,
    databases: [] as SqluiCore.DatabaseMetaData[],
  };

  try {
    const engine = getDataAdapter(connection.connection);
    const databases = await engine.getDatabases();

    connItem.status = 'online';
    connItem.dialect = engine.dialect;

    for (const database of databases) {
      connItem.databases.push(database);

      try {
        database.tables = await engine.getTables(database.name);
        //console.log('getting tables', database, tables);
      } catch (err) {
        database.tables = [];
        //console.log('failed getting tables', database);
      }

      for (const table of database.tables) {
        try {
          table.columns = await engine.getColumns(table.name, database.name);
        } catch (err) {
          table.columns = [];
          //console.log('failed getting columns', database, table);
        }
      }
    }
  } catch (err) {
    // console.log('connection error', connection.name, err);
    connItem.status = 'offline';
    connItem.dialect = undefined;
    console.log('>> Server Error', err);

    // also clean up the connection if there is error
    delete _adapterCache[connection.connection];
  }

  return connItem;
}

export function resetConnectionMetaData(connection: SqluiCore.CoreConnectionProps) {
  const connItem: SqluiCore.CoreConnectionMetaData = {
    name: connection.name,
    id: connection?.id,
    connection: connection.connection,
    databases: [] as SqluiCore.DatabaseMetaData[],
    status: 'offline',
  };

  // also clean up the connection
  delete _adapterCache[connection.connection];

  return connItem;
}

export async function getDatabases(sessionId: string, connectionId: string) {
  const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
    sessionId,
    'connection',
  ).get(connectionId);

  return (await getDataAdapter(connection.connection).getDatabases()).sort((a, b) =>
    (a.name || '').localeCompare(b.name || ''),
  );
}

export async function getTables(sessionId: string, connectionId: string, databaseId: string) {
  const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
    sessionId,
    'connection',
  ).get(connectionId);

  return (await getDataAdapter(connection.connection).getTables(databaseId)).sort((a, b) =>
    (a.name || '').localeCompare(b.name || ''),
  );
}

export async function getColumns(
  sessionId: string,
  connectionId: string,
  databaseId: string,
  tableId: string,
) {
  const connection = await new PersistentStorage<SqluiCore.ConnectionProps>(
    sessionId,
    'connection',
  ).get(connectionId);

  return (await getDataAdapter(connection.connection).getColumns(tableId, databaseId))
    .map((column) => {
      // here clean up unnecessary property
      if (column.primaryKey !== true) {
        delete column.primaryKey;
      }

      if (column.unique !== true) {
        delete column.unique;
      }

      if (column.nested !== true) {
        delete column.nested;
      }

      if (!column?.propertyPath || column?.propertyPath.length <= 1) {
        delete column.propertyPath;
      }

      return column;
    })
    .sort((a, b) => {
      const aPrimaryKey = a.primaryKey || a.kind === 'partition_key';
      const bPrimaryKey = b.primaryKey || b.kind === 'partition_key';

      if (aPrimaryKey !== bPrimaryKey) {
        return aPrimaryKey ? -1 : 1;
      }

      if (a.unique !== b.unique) {
        return a.unique ? -1 : 1;
      }

      const aClusterKey = a.kind === 'clustering';
      const bClusterKey = b.kind === 'clustering';

      if (aClusterKey !== bClusterKey) {
        return aClusterKey ? -1 : 1;
      }

      return (a.name || '').localeCompare(b.name || '');
    });
}
