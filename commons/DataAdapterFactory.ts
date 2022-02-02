import { SqluiCore } from '../typings';
import RelationalDataAdapter from './adapters/RelationalDataAdapter';
import CoreDataAdapter from './adapters/CoreDataAdapter';

const _adapterCache: { [index: string]: CoreDataAdapter } = {};

function getConnectionType(connection: string) {
  const parsedConnectionType = connection.substr(0, connection.indexOf(':')).toLowerCase();
  switch (parsedConnectionType) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      return parsedConnectionType;
    case 'cassandra':
    // TODO: to be implemented
    default:
      return undefined;
  }
}

export function getDataAdapter(connection: string) {
  if (_adapterCache[connection]) {
    return _adapterCache[connection];
  }

  // TOOD: here we should initialize the connection based on type
  // of the connection string

  const engine = new RelationalDataAdapter(connection);
  _adapterCache[connection] = engine;
  return engine;
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
