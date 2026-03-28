/** Structured form fields for REST API connection config (HOST + variables). */

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

/** Parsed REST API connection config. */
type RestApiConfig = {
  /** Base host URL. */
  HOST?: string;
  /** Collection-level variables. */
  variables?: Variable[];
};

/** Props for the RestApiConnectionFields component. */
type RestApiConnectionFieldsProps = {
  /** The full connection string (e.g., restapi://{"HOST":"...","variables":[...]}). */
  connection: string;
  /** Callback to update the connection string. */
  setConnection: (newVal: string) => void;
};

/**
 * Parses the JSON config from a restapi:// connection string.
 * @param connection - The full connection string.
 * @returns Parsed config or empty object.
 */
function parseConfig(connection: string): RestApiConfig {
  try {
    const json = connection.replace(/^(restapi|rest):\/\//, "");
    return json ? JSON.parse(json) : {};
  } catch (_err) {
    return {};
  }
}

/**
 * Builds a rest:// connection string from config.
 * @param config - The REST API config object.
 * @returns The formatted connection string.
 */
function buildConnectionString(config: RestApiConfig): string {
  return `rest://${JSON.stringify(config)}`;
}

/**
 * Structured form fields for editing REST API connection config.
 * Shows HOST input and a variables table with add/remove/toggle.
 * @param props - The connection string and setter.
 * @returns The REST API config form fields.
 */
export default function RestApiConnectionFields(props: RestApiConnectionFieldsProps): JSX.Element {
  const { connection, setConnection } = props;
  const config = parseConfig(connection);

  const [host, setHost] = useState(config.HOST || "");
  const [variables, setVariables] = useState<Variable[]>(config.variables || []);

  // Track whether we should skip syncing from props (to avoid clobbering local edits)
  const internalUpdateRef = useRef(false);

  // Sync from connection string when it changes externally
  useEffect(() => {
    if (internalUpdateRef.current) {
      internalUpdateRef.current = false;
      return;
    }
    const parsed = parseConfig(connection);
    setHost(parsed.HOST || "");
    setVariables(parsed.variables || []);
  }, [connection]);

  /** Writes the current state back to the connection string. */
  const syncToConnection = useCallback(
    (newHost: string, newVars: Variable[]) => {
      const newConfig: RestApiConfig = {};
      if (newHost) newConfig.HOST = newHost;
      if (newVars.length > 0) newConfig.variables = newVars;
      internalUpdateRef.current = true;
      setConnection(buildConnectionString(newConfig));
    },
    [setConnection],
  );

  /** Handles HOST field changes. */
  const onHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHost = e.target.value;
    setHost(newHost);
    syncToConnection(newHost, variables);
  };

  /** Adds a new empty variable row. */
  const onAddVariable = () => {
    const newVars = [...variables, { key: "", value: "", enabled: true }];
    setVariables(newVars);
    syncToConnection(host, newVars);
  };

  /** Updates a variable field at the given index. */
  const onUpdateVariable = (index: number, field: keyof Variable, val: string | boolean) => {
    const newVars = variables.map((v, i) => (i === index ? { ...v, [field]: val } : v));
    setVariables(newVars);
    syncToConnection(host, newVars);
  };

  /** Removes a variable at the given index. */
  const onRemoveVariable = (index: number) => {
    const newVars = variables.filter((_, i) => i !== index);
    setVariables(newVars);
    syncToConnection(host, newVars);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <TextField
        label="HOST (base URL, used as {{HOST}})"
        value={host}
        onChange={onHostChange}
        size="small"
        fullWidth
        placeholder="https://api.example.com"
        autoComplete="off"
      />
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
            No variables defined. Use {"{{VAR}}"} in your requests to reference variables.
          </Typography>
        )}
      </div>
    </div>
  );
}
