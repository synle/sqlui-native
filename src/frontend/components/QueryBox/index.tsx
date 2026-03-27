import AddCircleIcon from "@mui/icons-material/AddCircle";
import BackupIcon from "@mui/icons-material/Backup";
import FormatColorTextIcon from "@mui/icons-material/FormatColorText";
import HelpIcon from "@mui/icons-material/Help";
import InfoIcon from "@mui/icons-material/Info";
import MenuIcon from "@mui/icons-material/Menu";
import SendIcon from "@mui/icons-material/Send";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import LoadingButton from "@mui/lab/LoadingButton";
import { Button } from "@mui/material";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "src/frontend/utils/commonUtils";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { getSyntaxModeByDialect, getTableActions } from "src/common/adapters/DataScriptFactory";
import CodeEditorBox, { CompletionItem, EditorRef } from "src/frontend/components/CodeEditorBox";
import DropdownButton from "src/frontend/components/DropdownButton";
import { useCommands } from "src/frontend/components/MissionControl";
import ConnectionDatabaseSelector from "src/frontend/components/QueryBox/ConnectionDatabaseSelector";
import ConnectionRevealButton from "src/frontend/components/QueryBox/ConnectionRevealButton";
import ResultBox from "src/frontend/components/ResultBox";
import {
  refreshAfterExecution,
  useExecute,
  useGetCachedSchema,
  useGetColumns,
  useGetConnectionById,
  useGetConnections,
} from "src/frontend/hooks/useConnection";
import { useConnectionQuery } from "src/frontend/hooks/useConnectionQuery";
import { useLayoutModeSetting, useQuerySizeSetting } from "src/frontend/hooks/useSetting";
import useToaster from "src/frontend/hooks/useToaster";
import {
  DEBOUNCE_MS,
  DELTA_THRESHOLD,
  MIN_TRACKING_LENGTH,
  normalizeSql,
  useAddQueryVersionHistory,
} from "src/frontend/hooks/useQueryVersionHistory";
import { formatDuration, formatJS, formatSQL } from "src/frontend/utils/formatter";
import { SqluiCore } from "typings";

/** Maximum number of connections before column autocomplete is limited to the selected table only. */
const MAX_CONNECTIONS_FOR_FULL_AUTOCOMPLETE = 5;

/** Props for the QueryBox component. */
type QueryBoxProps = {
  /** Unique identifier for the query tab. */
  queryId: string;
};

/** Props for the ConnectionActionsButton component. */
type ConnectionActionsButtonProps = {
  /** The connection query containing connectionId, databaseId, and tableId. */
  query: SqluiCore.ConnectionQuery;
};

/**
 * Dropdown button listing available table actions (select, insert, update, delete, etc.) for the current query's table.
 * @param props - Contains the connection query with connectionId, databaseId, and tableId.
 * @returns A dropdown button with table actions, or null if connection/table are not selected.
 */
function ConnectionActionsButton(props: ConnectionActionsButtonProps): JSX.Element | null {
  const { query } = props;
  const { databaseId, connectionId, tableId } = query;
  const querySize = useQuerySizeSetting();

  const { selectCommand } = useCommands();

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(connectionId, databaseId, tableId);

  const dialect = connection?.dialect;

  const isLoading = loadingConnection || loadingColumns;

  const actions = getTableActions({
    dialect,
    connectionId,
    databaseId,
    tableId,
    columns: columns || [],
    querySize,
  });

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      action.query &&
      selectCommand({
        event: "clientEvent/query/apply",
        data: {
          connectionId,
          databaseId,
          tableId: tableId,
          sql: action.query,
        },
        label: `Applied "${action.label}" to active query tab.`,
      }),
  }));

  if (!databaseId || !connectionId || !tableId) {
    return null;
  }

  return (
    <DropdownButton id="session-action-split-button" options={options} isLoading={isLoading} maxHeight="400px">
      <IconButton aria-label="Table Actions" color="inherit">
        <MenuIcon fontSize="inherit" color="inherit" />
      </IconButton>
    </DropdownButton>
  );
}

/** Supported language modes for code snippet generation. */
const ALL_CODE_SNIPPETS: SqluiCore.LanguageMode[] = ["javascript", "python", "java"];

/**
 * Dropdown button for generating and displaying sample code snippets in JavaScript, Python, or Java.
 * @param props - Contains the queryId to look up the current query and connection.
 * @returns A dropdown button with language options, or null if no query is active.
 */
function CodeSnippetButton(props: QueryBoxProps) {
  const { queryId } = props;
  const { query } = useConnectionQuery(queryId);
  const { data: connection } = useGetConnectionById(query?.connectionId);
  const { selectCommand } = useCommands();

  if (!query) {
    return null;
  }

  const options = ALL_CODE_SNIPPETS.map((language) => ({
    label: language,
    onClick: async () =>
      selectCommand({
        event: "clientEvent/query/showSampleCodeSnippet",
        data: {
          connection,
          language,
          query,
        },
      }),
  }));

  return (
    <DropdownButton id="session-action-split-button" options={options} maxHeight="400px">
      <Button type="button" variant="outlined" startIcon={<InfoIcon />}>
        Snippet
      </Button>
    </DropdownButton>
  );
}

/**
 * Main query editor component with connection/database selectors, code editor, execute button, and result display.
 * @param props - Contains the queryId identifying which query tab to render.
 * @returns The query box UI or null/loading indicator.
 */
function QueryBox(props: QueryBoxProps): JSX.Element | null {
  const { queryId } = props;
  const editorRef = useRef<EditorRef>();
  const executionIdRef = useRef(0);
  const { query, onChange, isLoading: loadingConnection } = useConnectionQuery(queryId);
  const { mutateAsync: executeQuery } = useExecute();
  const [executing, setExecuting] = useState(false);
  const layoutMode = useLayoutModeSetting();
  const [expanded, setExpanded] = useState(layoutMode !== "compact");
  const { data: selectedConnection } = useGetConnectionById(query?.connectionId);
  const queryClient = useQueryClient();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const navigate = useNavigate();
  const { mutateAsync: addVersionEntry } = useAddQueryVersionHistory();

  // version history: delta tracking
  const lastTrackedSqlRef = useRef<string>("");
  const deltaTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackVersion = useCallback(
    (sql: string, auditType: SqluiCore.QueryVersionAuditType) => {
      if (!query?.connectionId || !sql) return;
      const normalized = normalizeSql(sql);
      if (!normalized) return;
      // skip duplicates
      if (normalized === normalizeSql(lastTrackedSqlRef.current)) return;
      lastTrackedSqlRef.current = sql;
      addVersionEntry({
        connectionId: query.connectionId,
        sql,
        auditType,
        name: selectedConnection?.name,
      }).catch((err) => console.error("QueryBox:trackVersion", err));
    },
    [query?.connectionId, addVersionEntry, selectedConnection?.name],
  );

  // debounced delta tracking on sql change
  useEffect(() => {
    const sql = query?.sql || "";
    if (sql.length < MIN_TRACKING_LENGTH || !query?.connectionId) return;
    const normalized = normalizeSql(sql);
    const lastNormalized = normalizeSql(lastTrackedSqlRef.current);
    const delta = Math.abs(normalized.length - lastNormalized.length);
    if (delta < DELTA_THRESHOLD) return;

    if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    deltaTimerRef.current = setTimeout(() => {
      trackVersion(sql, "delta");
    }, DEBOUNCE_MS);

    return () => {
      if (deltaTimerRef.current) clearTimeout(deltaTimerRef.current);
    };
  }, [query?.sql, query?.connectionId, trackVersion]);

  const { data: connections } = useGetConnections();
  const { data: cachedSchema } = useGetCachedSchema(query?.connectionId, query?.databaseId);

  const completionItems: CompletionItem[] = useMemo(() => {
    const items: CompletionItem[] = [];
    const selectedTableId = query?.tableId;

    if (cachedSchema?.databases) {
      for (const db of cachedSchema.databases) {
        items.push({ label: db.name, kind: "database", detail: "Database" });
      }
    }

    if (cachedSchema?.tables) {
      for (const table of cachedSchema.tables) {
        items.push({ label: table.name, kind: "table", detail: "Table" });
      }
    }

    if (cachedSchema?.columns) {
      if (selectedTableId) {
        // Table is selected — only show columns for that table
        const selectedColumns = cachedSchema.columns[selectedTableId] as SqluiCore.ColumnMetaData[] | undefined;
        if (selectedColumns) {
          for (const col of selectedColumns) {
            items.push({
              label: col.name,
              kind: "column",
              detail: `Column (${selectedTableId} - ${col.type})`,
            });
            items.push({
              label: `${selectedTableId}.${col.name}`,
              kind: "column",
              detail: `Column (${col.type})`,
            });
          }
        }
      } else if (!connections || connections.length <= MAX_CONNECTIONS_FOR_FULL_AUTOCOMPLETE) {
        // No table selected, few connections — show all cached columns
        const seen = new Set<string>();
        for (const [tableName, columns] of Object.entries(cachedSchema.columns) as [string, SqluiCore.ColumnMetaData[]][]) {
          for (const col of columns) {
            if (!seen.has(col.name)) {
              seen.add(col.name);
              items.push({
                label: col.name,
                kind: "column",
                detail: `Column (${tableName} - ${col.type})`,
              });
            }
            items.push({
              label: `${tableName}.${col.name}`,
              kind: "column",
              detail: `Column (${col.type})`,
            });
          }
        }
      }
    }

    return items;
  }, [cachedSchema, query?.tableId, connections]);

  const language: string = useMemo(() => getSyntaxModeByDialect(selectedConnection?.dialect), [selectedConnection?.dialect, query?.sql]);
  const isLoading = loadingConnection;
  const isExecuting = executing;
  const isMigrationVisible = !!query?.connectionId && !!query?.databaseId;
  const isCreateRecordVisible = isMigrationVisible;

  useLayoutEffect(() => {
    setExpanded(layoutMode !== "compact");
  }, [layoutMode]);

  const onDatabaseConnectionChange = useCallback(
    (connectionId?: string, databaseId?: string, tableId?: string) => {
      onChange({ connectionId, databaseId, tableId });
    },
    [onChange],
  );

  /** Syncs editor text to query state — fires on blur and debounced live typing. */
  const onSqlQueryChange = useCallback(
    (newQuery: string) => {
      onChange({ sql: newQuery });
    },
    [onChange],
  );

  const onFormatQuery = () => {
    if (!query || (query && query.sql && query.sql.length > 20000)) {
      // this is too large for the library to handle
      // let's stop it
      return;
    }
    let { sql } = query;
    sql = sql || "";

    switch (language) {
      case "sql":
        sql = formatSQL(sql);
        break;
      case "javascript":
        sql = formatJS(sql);
        break;
    }

    onChange({ sql });
  };

  const onSubmit = async (e: React.SyntheticEvent) => {
    if (!query) {
      return;
    }

    e.preventDefault();
    setExecuting(true);

    const currentExecutionId = ++executionIdRef.current;

    const executionStart = Date.now();
    onChange({ executionStart, result: undefined, executionEnd: undefined });

    let success = false;
    let newResult: SqluiCore.Result | undefined;

    const queryToExecute = {
      ...query,
    };

    // read the latest value directly from the editor to avoid stale React state
    // (e.g. when the user types and clicks Execute before blur propagates)
    try {
      const selectedSql = editorRef?.current?.getSelectedText();
      if (selectedSql) {
        queryToExecute.sql = selectedSql;
      } else {
        const currentSql = editorRef?.current?.getValue();
        if (currentSql !== undefined) {
          queryToExecute.sql = currentSql;
          onChange({ sql: currentSql });
        }
      }
    } catch (err) {
      console.error("index.tsx:getEditorValue", err);
    }

    try {
      newResult = await executeQuery(queryToExecute);

      // only apply results if this is still the latest execution
      if (currentExecutionId !== executionIdRef.current) {
        return;
      }

      onChange({ result: newResult });
      refreshAfterExecution(queryToExecute, queryClient);

      // track execution in version history
      if (queryToExecute.sql) {
        trackVersion(queryToExecute.sql, "execution");
      }

      success = newResult.ok;
    } catch (err) {
      console.error("index.tsx:refreshAfterExecution", err);
      // here query failed...
      if (currentExecutionId !== executionIdRef.current) {
        return;
      }
    }
    setExecuting(false);

    const executionEnd = Date.now();
    onChange({ executionEnd });

    const { sql, ...queryExtra } = query;
    const { selected, result: _result, ...toastMetaData } = queryExtra;

    let toastMessage = `Query "${queryToExecute.name}" executed ${
      success ? "successfully" : "unsuccessfully"
    } and took about ${formatDuration(executionEnd - executionStart)}...`;

    if (newResult?.raw && newResult?.raw?.length > 0) {
      toastMessage += ` And the query returned a total of ${newResult?.raw?.length} records.`;
    }

    await addToast({
      message: toastMessage,
      detail: sql,
      metadata: {
        ...toastMetaData,
      },
      persisted: true,
    });
  };

  const onShowMigrationForThisDatabaseAndTable = () => {
    navigate(
      `/migration/real_connection?connectionId=${query?.connectionId || ""}&databaseId=${
        query?.databaseId || ""
      }&tableId=${query?.tableId || ""}`,
    );
  };

  const onShowCreateNewRecordForThisDatabaseAndTable = () => {
    navigate(`/record/new?connectionId=${query?.connectionId || ""}&databaseId=${query?.databaseId || ""}&tableId=${query?.tableId || ""}`);
  };

  if (isLoading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!query) {
    return null;
  }

  return (
    <>
      <form className="QueryBox FormInput__Container" onSubmit={onSubmit} style={{ marginBottom: "1rem" }}>
        {expanded && (
          <div className="FormInput__Row">
            <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
            <ConnectionRevealButton query={query} />
            <ConnectionActionsButton query={query} />
          </div>
        )}
        <CodeEditorBox
          id={query.id}
          className="CodeEditorBox__QueryBox"
          value={query.sql}
          placeholder={`Enter SQL for ` + query.name}
          onChange={onSqlQueryChange}
          language={language}
          editorRef={editorRef}
          autoFocus
          required
          completionItems={completionItems}
        />
        <div className="FormInput__Row" style={{ flexWrap: "nowrap" }}>
          {!expanded && (
            <div className="FormInput__Row" style={{ flexShrink: 1, minWidth: 0, flexWrap: "nowrap" }}>
              <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
              <ConnectionRevealButton query={query} />
              <CodeSnippetButton {...props} />
            </div>
          )}
          <LoadingButton
            id="btnExecuteCommand"
            type="submit"
            variant="contained"
            loading={isExecuting}
            startIcon={<SendIcon />}
            size="small"
          >
            Execute
          </LoadingButton>
          {expanded && (
            <>
              <Tooltip title="Click here to see how to get started with some queries.">
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => selectCommand({ event: "clientEvent/showQueryHelp" })}
                  startIcon={<HelpIcon />}
                >
                  Show Query Help
                </Button>
              </Tooltip>
              <Tooltip title="Format the SQL query for readability.">
                <Button type="button" variant="outlined" onClick={onFormatQuery} startIcon={<FormatColorTextIcon />}>
                  Format
                </Button>
              </Tooltip>
              {isMigrationVisible && (
                <Tooltip title="Migrate this database and table.">
                  <Button type="button" variant="outlined" onClick={onShowMigrationForThisDatabaseAndTable} startIcon={<BackupIcon />}>
                    Migration
                  </Button>
                </Tooltip>
              )}
              {isCreateRecordVisible && (
                <Tooltip title="Create new record for this database and connection.">
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={onShowCreateNewRecordForThisDatabaseAndTable}
                    startIcon={<AddCircleIcon />}
                  >
                    New Record
                  </Button>
                </Tooltip>
              )}
              <CodeSnippetButton {...props} />
            </>
          )}
          <Tooltip title={expanded ? "Collapse form" : "Expand form"}>
            <IconButton
              aria-label="Toggle form collapse"
              color="inherit"
              onClick={() =>
                selectCommand({
                  event: "clientEvent/changeLayoutMode",
                  data: expanded ? "compact" : "comfortable",
                })
              }
              style={{ marginLeft: "auto" }}
            >
              {expanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
            </IconButton>
          </Tooltip>
        </div>
      </form>
      <ResultBox query={query} executing={executing} collapsed={!expanded} />
    </>
  );
}

export default React.memo(QueryBox);
