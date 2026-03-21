import KeyIcon from "@mui/icons-material/Key";
import SearchIcon from "@mui/icons-material/Search";
import StorageIcon from "@mui/icons-material/Storage";
import TableChartIcon from "@mui/icons-material/TableChart";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProxyApi } from "src/frontend/data/api";
import { SqluiCore } from "typings";

/** Maximum number of results to display. */
const MAX_RESULTS = 200;

/** Debounce delay in milliseconds for search input. */
const DEBOUNCE_MS = 300;

/** View mode for results: simple (grouped table rows) or detailed (column metadata). */
type ViewMode = "simple" | "detailed";

/** Props for the SchemaSearchModal component. */
type SchemaSearchModalProps = {
  /** Callback invoked when the user clicks a result to navigate to the tree. */
  onNavigate: (connectionId: string, databaseId: string, tableId: string) => void;
};

/** Grouped schema search results keyed by "connectionId::databaseId::tableId". */
type GroupedResults = Record<
  string,
  {
    connectionId: string;
    connectionName: string;
    connectionString: string;
    databaseId: string;
    tableId: string;
    columns: SqluiCore.ColumnMetaData[];
  }
>;

/**
 * Masks the password portion of a connection URL for safe display.
 * @param connStr - The raw connection string.
 * @returns The connection string with password replaced by asterisks.
 */
function maskConnectionString(connStr: string): string {
  try {
    return connStr.replace(/:([^/@:]+)@/, ":****@");
  } catch (_err) {
    return connStr;
  }
}

/**
 * Groups flat search results by connection + database + table.
 * @param results - The flat array of schema search results.
 * @returns An object keyed by "connectionId::databaseId::tableId" with grouped columns.
 */
function groupResults(results: SqluiCore.SchemaSearchResult[]): GroupedResults {
  const grouped: GroupedResults = {};
  for (const r of results) {
    const key = `${r.connectionId}::${r.databaseId}::${r.tableId}`;
    if (!grouped[key]) {
      grouped[key] = {
        connectionId: r.connectionId,
        connectionName: r.connectionName,
        connectionString: r.connectionString,
        databaseId: r.databaseId,
        tableId: r.tableId,
        columns: [],
      };
    }
    grouped[key].columns.push(r.column);
  }
  return grouped;
}

/**
 * Renders column badge chips (PK, FK, nullable, type).
 * @param column - The column metadata.
 * @returns JSX chips for column attributes.
 */
function ColumnBadges({ column }: { column: SqluiCore.ColumnMetaData }) {
  const isPK = column.primaryKey || column.kind === "partition_key";
  const isFK = column.kind === "foreign_key";
  return (
    <Box sx={{ display: "inline-flex", gap: 0.5, ml: 1, flexWrap: "wrap" }}>
      <Chip label={column.type} size="small" variant="outlined" sx={{ fontSize: "0.7rem", height: 20 }} />
      {isPK && (
        <Chip
          icon={<KeyIcon sx={{ fontSize: "0.8rem" }} />}
          label="PK"
          size="small"
          color="primary"
          sx={{ fontSize: "0.7rem", height: 20 }}
        />
      )}
      {isFK && (
        <Tooltip title={`FK → ${column.referencedTableName}.${column.referencedColumnName}`}>
          <Chip
            icon={<KeyIcon sx={{ fontSize: "0.8rem" }} />}
            label="FK"
            size="small"
            color="secondary"
            sx={{ fontSize: "0.7rem", height: 20 }}
          />
        </Tooltip>
      )}
      {column.allowNull === false && <Chip label="NOT NULL" size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />}
      {column.autoIncrement && <Chip label="AUTO" size="small" variant="outlined" sx={{ fontSize: "0.65rem", height: 20 }} />}
    </Box>
  );
}

/**
 * Modal content for searching across all cached schema metadata.
 * Provides a search input, two view modes (simple/detailed), and clickable results
 * that navigate to the corresponding table in the connection tree.
 * @param props - Props containing the navigation callback.
 * @returns The rendered schema search modal content.
 */
export default function SchemaSearchModal(props: SchemaSearchModalProps): JSX.Element {
  const { onNavigate } = props;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SqluiCore.SchemaSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("simple");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    try {
      const data = await ProxyApi.searchSchema(searchQuery.trim());
      setResults(data.slice(0, MAX_RESULTS));
      setSearched(true);
    } catch (err) {
      console.error("SchemaSearchModal:doSearch", err);
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, doSearch]);

  const grouped = groupResults(results);
  const groupKeys = Object.keys(grouped);

  const handleNavigate = (connectionId: string, databaseId: string, tableId: string) => {
    onNavigate(connectionId, databaseId, tableId);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, minHeight: "60vh" }}>
      <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="Search tables, columns, types... (e.g. email, user_id, varchar)"
          fullWidth
          size="small"
          autoComplete="off"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup value={viewMode} exclusive onChange={(_e, val) => val && setViewMode(val)} size="small">
          <ToggleButton value="simple">Simple</ToggleButton>
          <ToggleButton value="detailed">Detailed</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={24} />
        </Box>
      )}

      {!loading && searched && results.length === 0 && (
        <Alert severity="info">No results found. Make sure you have connected to your databases first so schema metadata is cached.</Alert>
      )}

      {!loading && !searched && (
        <Alert severity="info">Search across all cached schema metadata. Connect to databases first to populate the cache.</Alert>
      )}

      {!loading && results.length > 0 && (
        <Box sx={{ overflow: "auto", flex: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
            {results.length >= MAX_RESULTS ? `${MAX_RESULTS}+ results` : `${results.length} results`} in {groupKeys.length} tables
          </Typography>

          {groupKeys.map((groupKey) => {
            const group = grouped[groupKey];
            return (
              <Box
                key={groupKey}
                onClick={() => handleNavigate(group.connectionId, group.databaseId, group.tableId)}
                sx={{
                  mb: 1.5,
                  p: 1.5,
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 1,
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "action.hover",
                    borderColor: "primary.main",
                  },
                  transition: "all 0.15s",
                }}
              >
                {/* Connection + Database + Table header */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: viewMode === "detailed" ? 1 : 0.5 }}>
                  <StorageIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {group.connectionName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
                    &rsaquo;
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {group.databaseId}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mx: 0.5 }}>
                    &rsaquo;
                  </Typography>
                  <TableChartIcon fontSize="small" color="action" />
                  <Typography variant="body2" fontWeight="bold" noWrap>
                    {group.tableId}
                  </Typography>
                </Box>

                {viewMode === "detailed" && (
                  <Typography variant="caption" color="text.disabled" noWrap sx={{ display: "block", mb: 1, pl: 3.5 }}>
                    {maskConnectionString(group.connectionString)}
                  </Typography>
                )}

                {/* Columns */}
                {viewMode === "simple" ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, pl: 3.5 }}>
                    {group.columns.map((col) => {
                      const isPK = col.primaryKey || col.kind === "partition_key";
                      const isFK = col.kind === "foreign_key";
                      return (
                        <Chip
                          key={col.name}
                          icon={<ViewColumnIcon sx={{ fontSize: "0.85rem" }} />}
                          label={`${col.name} (${col.type})`}
                          size="small"
                          color={isPK ? "primary" : isFK ? "secondary" : "default"}
                          variant={isPK || isFK ? "filled" : "outlined"}
                          sx={{ fontSize: "0.75rem" }}
                        />
                      );
                    })}
                  </Box>
                ) : (
                  <Box sx={{ pl: 3.5 }}>
                    {group.columns.map((col) => (
                      <Box
                        key={col.name}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          py: 0.3,
                        }}
                      >
                        <ViewColumnIcon fontSize="small" color="disabled" sx={{ mr: 0.5 }} />
                        <Typography variant="body2" fontWeight="medium" sx={{ minWidth: 150 }}>
                          {col.name}
                        </Typography>
                        <ColumnBadges column={col} />
                        {col.kind === "foreign_key" && col.referencedTableName && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            &rarr; {col.referencedTableName}.{col.referencedColumnName}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
