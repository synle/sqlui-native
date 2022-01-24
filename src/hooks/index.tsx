import { useQuery } from 'react-query';
import ConnectionUtils from 'src/utils/ConnectionUtils';
import { RelationalDatabaseEngine } from 'src/utils/RelationalDatabaseEngine';

// useQuery('repoData', () =>
//    fetch('https://api.github.com/repos/tannerlinsley/react-query').then(res =>
//      res.json()
//    )
//  )

export function useGetConnections() {
  return useQuery(['connection'], () => ConnectionUtils.getConnections);
}

export function useGetConnection(connectionId: string) {
  return useQuery(['connection', connectionId], () => ConnectionUtils.getConnection(connectionId));
}

export function useAddConnection() {}

export function useUpdateConnection() {}

export function useDeleteConnection() {}

export function useGetDatabases(engine: RelationalDatabaseEngine) {
  return engine.getDatabases();
}

export function useGetTables(engine: RelationalDatabaseEngine, database: string) {
  return engine.getTables(database);
}

export function useGetColumns(engine: RelationalDatabaseEngine, database: string) {
  return engine.getColumns(database);
}

export function useExecute(engine: RelationalDatabaseEngine, sql: string, database?: string) {
  return engine.execute(sql, database);
}
