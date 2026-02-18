import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { useGetConnections, useUpdateConnections } from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery } from "src/frontend/hooks/useConnectionQuery";
import { useShowHide } from "src/frontend/hooks/useShowHide";
import { SqluiCore } from "typings";
import { TreeRow } from "./types";

const DEFAULT_STALE_TIME = 300000; // 5 minutes
const MAX_COLUMN_SIZE_TO_SHOW = 5;

type DatabaseQueryResult = {
  connectionId: string;
  data?: SqluiCore.DatabaseMetaData[];
  isLoading: boolean;
  isError: boolean;
};

type TableQueryResult = {
  connectionId: string;
  databaseId: string;
  data?: SqluiCore.TableMetaData[];
  isLoading: boolean;
  isError: boolean;
};

type ColumnQueryResult = {
  connectionId: string;
  databaseId: string;
  tableId: string;
  data?: SqluiCore.ColumnMetaData[];
  isLoading: boolean;
  isError: boolean;
};

export function useFlatTreeRows() {
  const { data: connections, isLoading: connectionsLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();
  const { mutateAsync: updateConnections } = useUpdateConnections(connections);

  // Determine which connections are expanded and online
  const expandedOnlineConnections = useMemo(() => {
    if (!connections) return [];
    return connections
      .filter((c) => {
        const key = c.id;
        return visibles[key] && c.status === "online";
      })
      .map((c) => c.id);
  }, [connections, visibles]);

  // Batch fetch databases for all expanded+online connections
  const databaseQueries = useQueries({
    queries: expandedOnlineConnections.map((connectionId) => ({
      queryKey: [connectionId, "databases"],
      queryFn: () => dataApi.getConnectionDatabases(connectionId),
      staleTime: DEFAULT_STALE_TIME,
    })),
  });

  const databaseResults = useMemo<DatabaseQueryResult[]>(() => {
    return expandedOnlineConnections.map((connectionId, i) => ({
      connectionId,
      data: databaseQueries[i]?.data as SqluiCore.DatabaseMetaData[] | undefined,
      isLoading: databaseQueries[i]?.isLoading ?? true,
      isError: databaseQueries[i]?.isError ?? false,
    }));
  }, [expandedOnlineConnections, databaseQueries]);

  // Determine which databases are expanded
  const expandedDatabases = useMemo(() => {
    const result: { connectionId: string; databaseId: string }[] = [];
    for (const dbResult of databaseResults) {
      if (!dbResult.data) continue;
      for (const db of dbResult.data) {
        const key = [dbResult.connectionId, db.name].join(" > ");
        if (visibles[key]) {
          result.push({ connectionId: dbResult.connectionId, databaseId: db.name });
        }
      }
    }
    return result;
  }, [databaseResults, visibles]);

  // Batch fetch tables for all expanded databases
  const tableQueries = useQueries({
    queries: expandedDatabases.map(({ connectionId, databaseId }) => ({
      queryKey: [connectionId, databaseId, "tables"],
      queryFn: () => dataApi.getConnectionTables(connectionId, databaseId),
      staleTime: DEFAULT_STALE_TIME,
    })),
  });

  const tableResults = useMemo<TableQueryResult[]>(() => {
    return expandedDatabases.map(({ connectionId, databaseId }, i) => ({
      connectionId,
      databaseId,
      data: tableQueries[i]?.data as SqluiCore.TableMetaData[] | undefined,
      isLoading: tableQueries[i]?.isLoading ?? true,
      isError: tableQueries[i]?.isError ?? false,
    }));
  }, [expandedDatabases, tableQueries]);

  // Determine which tables are expanded
  const expandedTables = useMemo(() => {
    const result: { connectionId: string; databaseId: string; tableId: string }[] = [];
    for (const tblResult of tableResults) {
      if (!tblResult.data) continue;
      for (const tbl of tblResult.data) {
        const key = [tblResult.connectionId, tblResult.databaseId, tbl.name].join(" > ");
        if (visibles[key]) {
          result.push({
            connectionId: tblResult.connectionId,
            databaseId: tblResult.databaseId,
            tableId: tbl.name,
          });
        }
      }
    }
    return result;
  }, [tableResults, visibles]);

  // Batch fetch columns for all expanded tables
  const columnQueries = useQueries({
    queries: expandedTables.map(({ connectionId, databaseId, tableId }) => ({
      queryKey: [connectionId, databaseId, tableId, "columns"],
      queryFn: () => dataApi.getConnectionColumns(connectionId, databaseId, tableId),
      staleTime: DEFAULT_STALE_TIME,
    })),
  });

  const columnResults = useMemo<ColumnQueryResult[]>(() => {
    return expandedTables.map(({ connectionId, databaseId, tableId }, i) => ({
      connectionId,
      databaseId,
      tableId,
      data: columnQueries[i]?.data as SqluiCore.ColumnMetaData[] | undefined,
      isLoading: columnQueries[i]?.isLoading ?? true,
      isError: columnQueries[i]?.isError ?? false,
    }));
  }, [expandedTables, columnQueries]);

  // Build flat row array
  const rows = useMemo<TreeRow[]>(() => {
    if (!connections) return [];

    const result: TreeRow[] = [];

    // Build lookup maps for databases, tables, columns
    const dbMap = new Map<string, DatabaseQueryResult>();
    for (const dbr of databaseResults) {
      dbMap.set(dbr.connectionId, dbr);
    }

    const tableMap = new Map<string, TableQueryResult>();
    for (const tr of tableResults) {
      tableMap.set(`${tr.connectionId}|${tr.databaseId}`, tr);
    }

    const colMap = new Map<string, ColumnQueryResult>();
    for (const cr of columnResults) {
      colMap.set(`${cr.connectionId}|${cr.databaseId}|${cr.tableId}`, cr);
    }

    for (let connIdx = 0; connIdx < connections.length; connIdx++) {
      const connection = connections[connIdx];
      const connKey = connection.id;
      const isOnline = connection.status === "online";
      const connExpanded = !!visibles[connKey];
      const connSelected = !!(activeQuery?.connectionId && activeQuery.connectionId === connection.id);

      result.push({
        type: "connection-header",
        key: `conn-${connKey}`,
        depth: 0,
        visibilityKey: connKey,
        connection,
        connectionIndex: connIdx,
        isSelected: connSelected,
        isExpanded: connExpanded,
      });

      if (!connExpanded) continue;

      if (!isOnline) {
        result.push({
          type: "connection-retry",
          key: `retry-${connKey}`,
          depth: 1,
          connectionId: connection.id,
        });
        continue;
      }

      // Databases
      const dbResult = dbMap.get(connection.id);
      if (!dbResult || dbResult.isLoading) {
        result.push({
          type: "loading",
          key: `loading-db-${connKey}`,
          depth: 1,
          message: "Loading...",
        });
        continue;
      }
      if (dbResult.isError) {
        result.push({
          type: "error",
          key: `error-db-${connKey}`,
          depth: 1,
          message: "Error...",
        });
        continue;
      }
      if (!dbResult.data || dbResult.data.length === 0) {
        result.push({
          type: "empty",
          key: `empty-db-${connKey}`,
          depth: 1,
          message: "Not Available",
        });
        continue;
      }

      for (const database of dbResult.data) {
        const dbKey = [connection.id, database.name].join(" > ");
        const dbExpanded = !!visibles[dbKey];
        const dbSelected = activeQuery?.connectionId === connection.id && activeQuery?.databaseId === database.name;

        result.push({
          type: "database-header",
          key: `db-${dbKey}`,
          depth: 1,
          visibilityKey: dbKey,
          connectionId: connection.id,
          databaseName: database.name,
          isSelected: dbSelected,
          isExpanded: dbExpanded,
        });

        if (!dbExpanded) continue;

        // Tables
        const tblResult = tableMap.get(`${connection.id}|${database.name}`);
        if (!tblResult || tblResult.isLoading) {
          result.push({
            type: "loading",
            key: `loading-tbl-${dbKey}`,
            depth: 2,
            message: "Loading...",
          });
          continue;
        }
        if (!tblResult.data || tblResult.data.length === 0) {
          result.push({
            type: "empty",
            key: `empty-tbl-${dbKey}`,
            depth: 2,
            message: "Not Available",
          });
          continue;
        }

        for (const table of tblResult.data) {
          const tblKey = [connection.id, database.name, table.name].join(" > ");
          const tblExpanded = !!visibles[tblKey];

          result.push({
            type: "table-header",
            key: `tbl-${tblKey}`,
            depth: 2,
            visibilityKey: tblKey,
            connectionId: connection.id,
            databaseId: database.name,
            tableName: table.name,
            isSelected: tblExpanded,
            isExpanded: tblExpanded,
          });

          if (!tblExpanded) continue;

          // Columns
          const colResult = colMap.get(`${connection.id}|${database.name}|${table.name}`);
          if (!colResult || colResult.isLoading) {
            result.push({
              type: "loading",
              key: `loading-col-${tblKey}`,
              depth: 3,
              message: "Loading...",
            });
            continue;
          }
          if (colResult.isError) {
            result.push({
              type: "error",
              key: `error-col-${tblKey}`,
              depth: 3,
              message: "Error...",
            });
            continue;
          }
          if (!colResult.data || colResult.data.length === 0) {
            result.push({
              type: "empty",
              key: `empty-col-${tblKey}`,
              depth: 3,
              message: "Not Available",
            });
            continue;
          }

          const showAllKey = [connection.id, database.name, table.name, "__ShowAllColumns__"].join(" > ");
          const showAll = colResult.data.length <= MAX_COLUMN_SIZE_TO_SHOW || !!visibles[showAllKey];

          const columnsToShow = showAll ? colResult.data : colResult.data.slice(0, MAX_COLUMN_SIZE_TO_SHOW + 1);

          for (const column of columnsToShow) {
            const colKey = [connection.id, database.name, table.name, column.name].join(" > ");
            const colExpanded = !!visibles[colKey];

            result.push({
              type: "column-header",
              key: `col-${colKey}`,
              depth: 3,
              visibilityKey: colKey,
              connectionId: connection.id,
              databaseId: database.name,
              tableId: table.name,
              column,
              isSelected: colExpanded,
              isExpanded: colExpanded,
            });

            if (colExpanded) {
              result.push({
                type: "column-attributes",
                key: `colattr-${colKey}`,
                depth: 4,
                column,
              });
            }
          }

          if (!showAll) {
            result.push({
              type: "show-all-columns",
              key: `showall-${tblKey}`,
              depth: 4,
              showAllKey,
            });
          }
        }
      }
    }

    return result;
  }, [connections, visibles, activeQuery, databaseResults, tableResults, columnResults]);

  return {
    rows,
    connections,
    connectionsLoading,
    onToggle,
    updateConnections,
  };
}
