/** Structured form fields for GraphQL connection config (ENDPOINT + headers + variables). */

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Button,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useRef, useState } from "react";

/** A single variable entry for {{VAR}} interpolation. */
type Variable = {
  /** Variable name. */
  key: string;
  /** Variable value. */
  value: string;
  /** Whether this variable is active. */
  enabled: boolean;
};

/** A single default header entry. */
type HeaderEntry = {
  /** Header name. */
  key: string;
  /** Header value. */
  value: string;
};

/** Parsed GraphQL connection config. */
type GraphQLConfig = {
  /** GraphQL endpoint URL. */
  ENDPOINT?: string;
  /** Default headers sent with every request. */
  headers?: Record<string, string>;
  /** Collection-level variables. */
  variables?: Variable[];
};

/** Props for the GraphQLConnectionFields component. */
type GraphQLConnectionFieldsProps = {
  /** The full connection string (e.g., graphql://{"ENDPOINT":"..."}). */
  connection: string;
  /** Callback to update the connection string. */
  setConnection: (newVal: string) => void;
};

/**
 * Parses the JSON config from a graphql:// connection string.
 * @param connection - The full connection string.
 * @returns Parsed config or empty object.
 */
function parseConfig(connection: string): GraphQLConfig {
  try {
    const json = connection.replace(/^graphql:\/\//, "");
    return json ? JSON.parse(json) : {};
  } catch (_err) {
    return {};
  }
}

/**
 * Builds a graphql:// connection string from config.
 * @param config - The GraphQL config object.
 * @returns The formatted connection string.
 */
function buildConnectionString(config: GraphQLConfig): string {
  return `graphql://${JSON.stringify(config)}`;
}

/**
 * Converts a headers Record to an array of HeaderEntry for table rendering.
 * @param headers - The headers object.
 * @returns Array of header entries.
 */
function headersToArray(headers?: Record<string, string>): HeaderEntry[] {
  if (!headers) return [];
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

/**
 * Converts an array of HeaderEntry back to a Record.
 * @param entries - The header entries array.
 * @returns Headers as key-value record.
 */
function arrayToHeaders(entries: HeaderEntry[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.key.trim()) {
      result[entry.key.trim()] = entry.value;
    }
  }
  return result;
}

/**
 * Structured form fields for editing GraphQL connection config.
 * Shows ENDPOINT input, default headers table, and variables table with add/remove/toggle.
 * @param props - The connection string and setter.
 * @returns The GraphQL config form fields.
 */
export default function GraphQLConnectionFields(props: GraphQLConnectionFieldsProps): React.JSX.Element {
  const { connection, setConnection } = props;
  const config = parseConfig(connection);

  const [endpoint, setEndpoint] = useState(config.ENDPOINT || "");
  const [headers, setHeaders] = useState<HeaderEntry[]>(headersToArray(config.headers));
  const [variables, setVariables] = useState<Variable[]>(config.variables || []);

  const internalUpdateRef = useRef(false);

  // Sync from connection string when it changes externally
  useEffect(() => {
    if (internalUpdateRef.current) {
      internalUpdateRef.current = false;
      return;
    }
    const parsed = parseConfig(connection);
    setEndpoint(parsed.ENDPOINT || "");
    setHeaders(headersToArray(parsed.headers));
    setVariables(parsed.variables || []);
  }, [connection]);

  /** Writes the current state back to the connection string. */
  const syncToConnection = useCallback(
    (newEndpoint: string, newHeaders: HeaderEntry[], newVars: Variable[]) => {
      const newConfig: GraphQLConfig = {};
      if (newEndpoint) newConfig.ENDPOINT = newEndpoint;
      const headersObj = arrayToHeaders(newHeaders);
      if (Object.keys(headersObj).length > 0) newConfig.headers = headersObj;
      if (newVars.length > 0) newConfig.variables = newVars;
      internalUpdateRef.current = true;
      setConnection(buildConnectionString(newConfig));
    },
    [setConnection],
  );

  /** Handles ENDPOINT field changes. */
  const onEndpointChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEndpoint = e.target.value;
    setEndpoint(newEndpoint);
    syncToConnection(newEndpoint, headers, variables);
  };

  // ---- Headers management ----

  /** Adds a new empty header row. */
  const onAddHeader = () => {
    const newHeaders = [...headers, { key: "", value: "" }];
    setHeaders(newHeaders);
    syncToConnection(endpoint, newHeaders, variables);
  };

  /** Updates a header field at the given index. */
  const onUpdateHeader = (index: number, field: keyof HeaderEntry, val: string) => {
    const newHeaders = headers.map((h, i) => (i === index ? { ...h, [field]: val } : h));
    setHeaders(newHeaders);
    syncToConnection(endpoint, newHeaders, variables);
  };

  /** Removes a header at the given index. */
  const onRemoveHeader = (index: number) => {
    const newHeaders = headers.filter((_, i) => i !== index);
    setHeaders(newHeaders);
    syncToConnection(endpoint, newHeaders, variables);
  };

  // ---- Variables management ----

  /** Adds a new empty variable row. */
  const onAddVariable = () => {
    const newVars = [...variables, { key: "", value: "", enabled: true }];
    setVariables(newVars);
    syncToConnection(endpoint, headers, newVars);
  };

  /** Updates a variable field at the given index. */
  const onUpdateVariable = (index: number, field: keyof Variable, val: string | boolean) => {
    const newVars = variables.map((v, i) => (i === index ? { ...v, [field]: val } : v));
    setVariables(newVars);
    syncToConnection(endpoint, headers, newVars);
  };

  /** Removes a variable at the given index. */
  const onRemoveVariable = (index: number) => {
    const newVars = variables.filter((_, i) => i !== index);
    setVariables(newVars);
    syncToConnection(endpoint, headers, newVars);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <TextField
        label="GraphQL Endpoint URL"
        value={endpoint}
        onChange={onEndpointChange}
        size="small"
        fullWidth
        placeholder="https://api.example.com/graphql"
        autoComplete="off"
      />

      {/* Default Headers */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <Typography variant="subtitle2">Default Headers</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddHeader}>
            Add Header
          </Button>
        </div>
        {headers.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {headers.map((header, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <TextField
                        value={header.key}
                        onChange={(e) => onUpdateHeader(idx, "key", e.target.value)}
                        size="small"
                        variant="standard"
                        placeholder="Authorization"
                        fullWidth
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={header.value}
                        onChange={(e) => onUpdateHeader(idx, "value", e.target.value)}
                        size="small"
                        variant="standard"
                        placeholder="Bearer {{ACCESS_TOKEN}}"
                        fullWidth
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <Tooltip title="Remove header">
                        <IconButton size="small" onClick={() => onRemoveHeader(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {headers.length === 0 && (
          <Typography variant="body2" sx={{ opacity: 0.6, fontSize: "0.8rem" }}>
            No default headers. Add headers like Authorization that should be sent with every request.
          </Typography>
        )}
      </div>

      {/* Variables */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
          <Typography variant="subtitle2">Variables</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddVariable}>
            Add Variable
          </Button>
        </div>
        {variables.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  <TableCell>Name</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell padding="checkbox" />
                </TableRow>
              </TableHead>
              <TableBody>
                {variables.map((variable, idx) => (
                  <TableRow key={idx}>
                    <TableCell padding="checkbox">
                      <Tooltip title={variable.enabled ? "Enabled" : "Disabled"}>
                        <Checkbox
                          checked={variable.enabled}
                          onChange={(e) => onUpdateVariable(idx, "enabled", e.target.checked)}
                          size="small"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={variable.key}
                        onChange={(e) => onUpdateVariable(idx, "key", e.target.value)}
                        size="small"
                        variant="standard"
                        placeholder="VARIABLE_NAME"
                        fullWidth
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={variable.value}
                        onChange={(e) => onUpdateVariable(idx, "value", e.target.value)}
                        size="small"
                        variant="standard"
                        placeholder="value"
                        fullWidth
                        autoComplete="off"
                      />
                    </TableCell>
                    <TableCell padding="checkbox">
                      <Tooltip title="Remove variable">
                        <IconButton size="small" onClick={() => onRemoveVariable(idx)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        {variables.length === 0 && (
          <Typography variant="body2" sx={{ opacity: 0.6, fontSize: "0.8rem" }}>
            No variables defined. Use {"{{VAR}}"} in your queries to reference variables.
          </Typography>
        )}
      </div>
    </div>
  );
}
