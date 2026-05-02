import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import dataApi from "src/frontend/data/api";
import { SessionStorageConfig } from "src/frontend/data/config";
import { getCurrentSessionId } from "src/frontend/data/session";
import { useAddRecycleBinItem } from "src/frontend/hooks/useFolderItems";
import { useIsQueryTabAutoSaveEnabled, useIsSoftDeleteModeSetting } from "src/frontend/hooks/useSetting";
import { formatShortDate, getGeneratedRandomId, getUpdatedOrdersForList } from "src/frontend/utils/commonUtils";
import { SqluiCore, SqluiFrontend } from "typings";

// connection queries
let _connectionQueries: SqluiFrontend.ConnectionQuery[] = [];
const TargetContext = createContext({
  data: _connectionQueries,
  setData: (_newConnectionQueries: SqluiFrontend.ConnectionQuery[]) => {},
  isLoading: true,
});

function _getPersistableQueries(queries: SqluiFrontend.ConnectionQuery[] = _connectionQueries) {
  return queries.map((query, idx) => {
    const { result, executionEnd, executionStart, executing, executionDetails, isSnapshot, ...restOfQuery } = query;
    return {
      ...restOfQuery,
      tabOrder: idx,
      selected: !!query.selected,
    };
  });
}

function _persistQueries() {
  // store to client
  const toPersistQueries = _getPersistableQueries();
  SessionStorageConfig.set("clientConfig/cache.connectionQueries", toPersistQueries);
}

function _normalizeQueries(queries: SqluiFrontend.ConnectionQuery[]) {
  const normalizedQueries = (queries || []).map((query, idx) => ({
    ...query,
    tabOrder: query.tabOrder ?? idx,
  }));

  return normalizedQueries.sort((a, b) => (a.tabOrder ?? 0) - (b.tabOrder ?? 0));
}

/**
 * Context provider for connection queries. Loads persisted queries from session storage or API on mount.
 * @param props - Component props containing child elements.
 * @returns The context provider wrapping children.
 */
export default function WrappedContext(props: { children: React.ReactNode }): React.JSX.Element | null {
  // State to hold the theme value
  const [data, setData] = useState(_connectionQueries);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function _fetchData() {
      try {
        // this is the first time
        // try pulling it in from sessionStorage
        _connectionQueries = _normalizeQueries(
          SessionStorageConfig.get<SqluiFrontend.ConnectionQuery[]>("clientConfig/cache.connectionQueries", []),
        );

        if (_connectionQueries.length === 0 && getCurrentSessionId()) {
          // if config failed, attempt to get it from the api (only if a session is selected)
          try {
            _connectionQueries = _normalizeQueries(await dataApi.getQueries());
          } catch (err) {
            console.error("useConnectionQuery.tsx:getQueries", err);
          }
        }

        // at the end we want to remove executionStart so the query won't be run again
        let toBeSelectedQuery = 0;
        _connectionQueries = _connectionQueries.map((query, idx) => {
          if (query.selected) {
            toBeSelectedQuery = idx;
          }

          return { ...query, selected: false };
        });

        if (_connectionQueries[toBeSelectedQuery]) {
          _connectionQueries[toBeSelectedQuery] = {
            ..._connectionQueries[toBeSelectedQuery],
            selected: true,
          };
        }

        _persistQueries();

        setData(_connectionQueries);
      } finally {
        setIsLoading(false);
      }
    }

    _fetchData();
  }, []);

  /** Memoized context value to prevent unnecessary re-renders of consumers. */
  const contextValue = useMemo(() => ({ data, setData, isLoading }), [data, setData, isLoading]);

  // Provide the theme value and toggle function to the children components
  return <TargetContext.Provider value={contextValue}>{props.children}</TargetContext.Provider>;
}
function _useConnectionQueries() {
  const { data, setData, isLoading } = useContext(TargetContext)!;

  return {
    data,
    setData,
    isLoading,
  };
}

/**
 * Hook providing CRUD operations for connection queries (tabs).
 * Manages adding, deleting, selecting, duplicating, importing, and reordering query tabs.
 * @returns Query list, loading state, and mutation handlers.
 */
export function useConnectionQueries() {
  const { data: queries, setData, isLoading } = _useConnectionQueries();
  const { mutateAsync: addRecycleBinItem } = useAddRecycleBinItem();
  const isSoftDeleteModeSetting = useIsSoftDeleteModeSetting();
  const isQueryTabAutoSaveEnabled = useIsQueryTabAutoSaveEnabled();

  function _invalidateQueries() {
    _connectionQueries = _connectionQueries.map((query, idx) => ({
      ...query,
      tabOrder: idx,
      selected: !!query.selected,
    }));
    setData(_connectionQueries);

    _persistQueries();
  }

  const onSaveQueries = async (queryIds?: string[]) => {
    const idsToSave = queryIds ? new Set(queryIds) : undefined;
    const queriesToSave = _getPersistableQueries().filter((query) => !idsToSave || idsToSave.has(query.id));

    await Promise.all(queriesToSave.map((query) => dataApi.upsertQuery(query)));
    return queriesToSave.length;
  };

  const onSaveQuery = async (queryId?: string) => {
    if (!queryId) {
      return 0;
    }

    return onSaveQueries([queryId]);
  };

  const onAddQueries = async (queries: (SqluiCore.CoreConnectionQuery | undefined)[], options?: { preserveResult?: boolean }) => {
    queries = queries || [];

    const res: SqluiCore.CoreConnectionQuery[] = [];
    for (const query of queries) {
      let newQueryData: Partial<SqluiFrontend.ConnectionQuery>;
      if (!query) {
        newQueryData = {
          name: `Query ${formatShortDate()}`,
          sql: "",
          selected: true,
        };
      } else {
        let newQueryName = query.name || `Query ${formatShortDate()}`;

        for (const query of _connectionQueries) {
          if (query.name === newQueryName) {
            // replace it with a new anme
            newQueryName = `Duplicated Query ${formatShortDate()}`;
          }
        }

        const queryAny = query as any;
        newQueryData = {
          ...query,
          name: newQueryName,
          selected: true,
          result: options?.preserveResult ? queryAny.result : undefined,
          executionEnd: options?.preserveResult ? queryAny.executionEnd : undefined,
          executionStart: options?.preserveResult ? queryAny.executionStart : undefined,
          isSnapshot: options?.preserveResult && !!queryAny.result ? true : undefined,
        };
        // Strip id so the backend generates one
        delete newQueryData.id;
      }

      try {
        let persisted: SqluiCore.CoreConnectionQuery | undefined;
        if (isQueryTabAutoSaveEnabled) {
          persisted = await dataApi.upsertQuery(newQueryData as any);
        }

        const newQuery: SqluiFrontend.ConnectionQuery = {
          ...newQueryData,
          id: persisted?.id || newQueryData.id || getGeneratedRandomId("query"),
        } as any;

        _connectionQueries = [
          ..._connectionQueries.map((q) => ({
            ...q,
            selected: false,
          })),
          newQuery,
        ];

        res.push(newQuery);
      } catch (err) {
        console.error("useConnectionQuery.tsx:upsertQuery", err);
      }
    }

    try {
      _invalidateQueries();
      if (isQueryTabAutoSaveEnabled) {
        await onSaveQueries();
      }
    } catch (err) {
      console.error("useConnectionQuery.tsx:_invalidateQueries", err);
    }

    return res;
  };

  const onAddQuery = async (query?: SqluiCore.CoreConnectionQuery, options?: { preserveResult?: boolean }) =>
    (await onAddQueries([query], options))[0];

  const onDeleteQueries = async (queryIds?: string[]) => {
    if (!queryIds || queryIds.length === 0) {
      return;
    }

    if (isSoftDeleteModeSetting) {
      // generate the list of queries to store in recyclebin
      const toRecycleQueriesFolderItems: SqluiCore.FolderItemInput[] = _connectionQueries
        .filter((q) => {
          return queryIds.indexOf(q.id) >= 0;
        })
        .map((query) => {
          // here we should remove the isSelected flag
          const { selected, pinned, result, executionEnd, executionStart, executing, executionDetails, ...restOfQuery } = query;

          return {
            type: "Query",
            name: query.name,
            data: restOfQuery,
          };
        });

      // attempt to make backups
      try {
        await Promise.allSettled(toRecycleQueriesFolderItems.map(async (folderItem) => addRecycleBinItem(folderItem)));
      } catch (err) {
        console.error("useConnectionQuery.tsx:allSettled", err);
      }
    }

    let toBeSelected = 0;
    if (queryIds.length === 1) {
      const [queryId] = queryIds;
      _connectionQueries = _connectionQueries.filter((q, idx) => {
        if (q.pinned) {
          return true;
        }
        if (q.id !== queryId) {
          return true;
        }
        toBeSelected = Math.max(0, idx - 1);

        return false;
      });
    } else {
      _connectionQueries = _connectionQueries.filter((q) => {
        if (q.pinned) {
          return true;
        }

        if (queryIds.indexOf(q.id) >= 0) {
          return false;
        }

        return true;
      });
    }

    if (_connectionQueries[toBeSelected]) {
      _connectionQueries[toBeSelected].selected = true;
    }

    // remove closed tabs from saved workspace state too, so they do not restore on next launch.
    for (const queryId of queryIds) {
      // make api to delete the query
      dataApi.deleteQuery(queryId);
    }

    _invalidateQueries();
  };

  const onDeleteQuery = (queryId?: string) => queryId && onDeleteQueries([queryId]);

  const onShowQuery = (queryId: string) => {
    _connectionQueries = _connectionQueries.map((q) => ({
      ...q,
      selected: q.id === queryId,
    }));
    _invalidateQueries();

    if (isQueryTabAutoSaveEnabled) {
      // persist selected state to the backend so it survives sessionStorage loss
      onSaveQueries();
    }
  };

  const onChangeQuery = async (queryId: string | undefined, partials: SqluiFrontend.PartialConnectionQuery) => {
    if (!queryId) {
      if (!queries || queries.length === 0) {
        // this is an edge case where users already closed all the query tab
        const newQuery = await onAddQuery({
          name: `Query ${formatShortDate()}`,
          ...partials,
        });

        queryId = newQuery.id;
      }
    }

    _connectionQueries = [..._connectionQueries].map((query) => {
      if (query.id === queryId) {
        const newValue = {
          ...query,
          ...partials,
        };
        return newValue;
      }

      return query;
    });

    const query = _connectionQueries?.find((q) => q.id === queryId);
    if (!query) {
      return;
    }

    try {
      _invalidateQueries();
      if (isQueryTabAutoSaveEnabled) {
        const queryToPersist = _getPersistableQueries().find((q) => q.id === query.id);
        if (queryToPersist) {
          dataApi.upsertQuery(queryToPersist); // make an api call to persists and this is fire and forget
        }
      }
    } catch (err) {
      console.error("useConnectionQuery.tsx:upsertQuery", err);
    }
  };

  const onDuplicateQuery = (queryId?: string) => {
    const query = queries?.find((q) => q.id === queryId);

    if (!query) {
      return;
    }

    onAddQuery(query);
  };

  const onImportQuery = (query?: SqluiFrontend.ConnectionQuery) => {
    if (!query) {
      return;
    }

    // strip timestamps — they are auto-set by PersistentStorage on creation
    const { createdAt: _ca, updatedAt: _ua, ...queryWithoutTimestamps } = query;
    return onAddQuery(queryWithoutTimestamps);
  };

  const onChangeTabOrdering = (from: number, to: number) => {
    _connectionQueries = getUpdatedOrdersForList(_connectionQueries, from, to);
    _invalidateQueries();
    if (isQueryTabAutoSaveEnabled) {
      onSaveQueries();
    }
  };

  return {
    isLoading,
    queries,
    onAddQuery,
    onAddQueries,
    onDeleteQuery,
    onDeleteQueries,
    onShowQuery,
    onChangeQuery,
    onDuplicateQuery,
    onImportQuery,
    onChangeTabOrdering,
    onSaveQuery,
    onSaveQueries,
  };
}

/**
 * Hook to access and manage a single connection query by ID.
 * @param queryId - The ID of the query to retrieve.
 * @returns The query object, loading state, and onChange/onDelete handlers.
 */
export function useConnectionQuery(queryId: string) {
  const { queries, onChangeQuery, onDeleteQuery, isLoading } = useConnectionQueries();

  const query = queries?.find((q) => q.id === queryId);

  const onChange = (partials: SqluiFrontend.PartialConnectionQuery) => onChangeQuery(query?.id, partials);

  const onDelete = () => onDeleteQuery(query?.id);

  return {
    isLoading,
    query,
    onChange,
    onDelete,
  };
}

/**
 * Hook to access and manage the currently selected (active) connection query.
 * @returns The active query object, loading state, and onChange/onDelete handlers.
 */
export function useActiveConnectionQuery() {
  const { queries, onChangeQuery, onDeleteQuery, isLoading } = useConnectionQueries();

  const query = queries?.find((q) => q.selected);

  const onChange = (partials: SqluiFrontend.PartialConnectionQuery) => onChangeQuery(query?.id, partials);

  const onDelete = () => onDeleteQuery(query?.id);

  return {
    isLoading,
    query,
    onChange,
    onDelete,
  };
}
