import { useQueries } from "@tanstack/react-query";
import dataApi from "src/frontend/data/api";
import { useGetConnections, useUpdateConnections, useAutoConnectAll } from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery } from "src/frontend/hooks/useConnectionQuery";
import { useShowHide } from "src/frontend/hooks/useShowHide";
import { SqluiCore } from "typings";
import { TreeRow } from "./types";

/** Maximum number of columns to display before showing a "Show All" button. */
const MAX_COLUMN_SIZE_TO_SHOW = 20;

/** Result of a database metadata query for a connection. */
type DatabaseQueryResult = {
  connectionId: string;
  data?: SqluiCore.DatabaseMetaData[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

/** Result of a table metadata query for a database. */
type TableQueryResult = {
  connectionId: string;
  databaseId: string;
  data?: SqluiCore.TableMetaData[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

/** Result of a column metadata query for a table. */
type ColumnQueryResult = {
  connectionId: string;
  databaseId: string;
  tableId: string;
  data?: SqluiCore.ColumnMetaData[];
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
};

/**
 * Extracts a human-readable error message from a query error.
 * Handles backend error objects ({ error: string }), Error instances, and plain strings.
 * @param error - The error value from a React Query result.
 * @returns A user-friendly error message string.
 */
function getErrorMessage(error: unknown): string {
  if (!error) return "Error";
  if (typeof error === "object" && error !== null && "error" in error) {
    return String((error as { error: string }).error);
  }
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Error";
}

/**
 * Hook that builds a flat array of tree rows from connections, databases, tables, and columns.
 * Batches data fetching for expanded nodes and tracks visibility/selection state.
 * @returns Flat row array, fingerprint string, connections data, loading state, toggle handler, and update function.
 */
export function useFlatTreeRows() {
  const { data: connections, isLoading: connectionsLoading } = useGetConnections();
  useAutoConnectAll(connections);
  const { visibles, onToggle } = useShowHide();
  const { query: activeQuery } = useActiveConnectionQuery();
  const { mutateAsync: updateConnections } = useUpdateConnections(connections);

  // Determine which connections are expanded and online
  const expandedOnlineConnections: string[] = [];
  if (connections) {
    for (const c of connections) {
      if (visibles[c.id] && c.status === "online") {
        expandedOnlineConnections.push(c.id);
      }
    }
  }

  // Batch fetch databases for all expanded+online connections
  const databaseQueries = useQueries({
    queries: expandedOnlineConnections.map((connectionId) => ({
      queryKey: [connectionId, "databases"],
      queryFn: () => dataApi.getConnectionDatabases(connectionId),
    })),
  });

  const databaseResults: DatabaseQueryResult[] = expandedOnlineConnections.map((connectionId, i) => ({
    connectionId,
    data: databaseQueries[i]?.data as SqluiCore.DatabaseMetaData[] | undefined,
    isLoading: databaseQueries[i]?.isLoading ?? true,
    isError: databaseQueries[i]?.isError ?? false,
    error: databaseQueries[i]?.error,
  }));

  // Determine which databases are expanded
  const expandedDatabases: { connectionId: string; databaseId: string }[] = [];
  for (const dbResult of databaseResults) {
    if (!dbResult.data) continue;
    for (const db of dbResult.data) {
      const key = [dbResult.connectionId, db.name].join(" > ");
      if (visibles[key]) {
        expandedDatabases.push({ connectionId: dbResult.connectionId, databaseId: db.name });
      }
    }
  }

  // Batch fetch tables for all expanded databases
  const tableQueries = useQueries({
    queries: expandedDatabases.map(({ connectionId, databaseId }) => ({
      queryKey: [connectionId, databaseId, "tables"],
      queryFn: () => dataApi.getConnectionTables(connectionId, databaseId),
    })),
  });

  const tableResults: TableQueryResult[] = expandedDatabases.map(({ connectionId, databaseId }, i) => ({
    connectionId,
    databaseId,
    data: tableQueries[i]?.data as SqluiCore.TableMetaData[] | undefined,
    isLoading: tableQueries[i]?.isLoading ?? true,
    isError: tableQueries[i]?.isError ?? false,
    error: tableQueries[i]?.error,
  }));

  // Determine which tables are expanded
  const expandedTables: { connectionId: string; databaseId: string; tableId: string }[] = [];
  for (const tblResult of tableResults) {
    if (!tblResult.data) continue;
    for (const tbl of tblResult.data) {
      const key = [tblResult.connectionId, tblResult.databaseId, tbl.name].join(" > ");
      if (visibles[key]) {
        expandedTables.push({
          connectionId: tblResult.connectionId,
          databaseId: tblResult.databaseId,
          tableId: tbl.name,
        });
      }
    }
  }

  // Batch fetch columns for all expanded tables
  const columnQueries = useQueries({
    queries: expandedTables.map(({ connectionId, databaseId, tableId }) => ({
      queryKey: [connectionId, databaseId, tableId, "columns"],
      queryFn: () => dataApi.getConnectionColumns(connectionId, databaseId, tableId),
    })),
  });

  const columnResults: ColumnQueryResult[] = expandedTables.map(({ connectionId, databaseId, tableId }, i) => ({
    connectionId,
    databaseId,
    tableId,
    data: columnQueries[i]?.data as SqluiCore.ColumnMetaData[] | undefined,
    isLoading: columnQueries[i]?.isLoading ?? true,
    isError: columnQueries[i]?.isError ?? false,
    error: columnQueries[i]?.error,
  }));

  // Build flat row array
  const rows: TreeRow[] = [];

  if (connections) {
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

      rows.push({
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

      if (connection.status === "loading") {
        rows.push({
          type: "loading",
          key: `connecting-${connKey}`,
          depth: 1,
          message: "Connecting to server...",
        });
        continue;
      }

      if (!isOnline) {
        rows.push({
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
        rows.push({
          type: "loading",
          key: `loading-db-${connKey}`,
          depth: 1,
          message: "Loading...",
        });
        continue;
      }
      if (dbResult.isError) {
        rows.push({
          type: "error",
          key: `error-db-${connKey}`,
          depth: 1,
          message: getErrorMessage(dbResult.error),
        });
        continue;
      }
      if (!dbResult.data || dbResult.data.length === 0) {
        rows.push({
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

        rows.push({
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
          rows.push({
            type: "loading",
            key: `loading-tbl-${dbKey}`,
            depth: 2,
            message: "Loading...",
          });
          continue;
        }
        if (tblResult.isError) {
          rows.push({
            type: "error",
            key: `error-tbl-${dbKey}`,
            depth: 2,
            message: getErrorMessage(tblResult.error),
          });
          continue;
        }
        if (!tblResult.data || tblResult.data.length === 0) {
          rows.push({
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

          rows.push({
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
            rows.push({
              type: "loading",
              key: `loading-col-${tblKey}`,
              depth: 3,
              message: "Loading...",
            });
            continue;
          }
          if (colResult.isError) {
            rows.push({
              type: "error",
              key: `error-col-${tblKey}`,
              depth: 3,
              message: getErrorMessage(colResult.error),
            });
            continue;
          }
          if (!colResult.data || colResult.data.length === 0) {
            rows.push({
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

            rows.push({
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
              rows.push({
                type: "column-attributes",
                key: `colattr-${colKey}`,
                depth: 4,
                column,
              });
            }
          }

          if (!showAll) {
            rows.push({
              type: "show-all-columns",
              key: `showall-${tblKey}`,
              depth: 4,
              showAllKey,
            });
          }
        }
      }
    }
  }

  // Build a structural fingerprint so consumers can detect tree shape changes
  const rowFingerprint = rows.map((r) => r.key).join("|");

  return {
    rows,
    rowFingerprint,
    connections,
    connectionsLoading,
    onToggle,
    updateConnections,
  };
}
