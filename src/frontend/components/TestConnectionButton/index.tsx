import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { getConnectionFormInputs, getConnectionStringFormat } from "src/common/adapters/DataScriptFactory";
import { ProxyApi } from "src/frontend/data/api";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { SqluiCore } from "typings";

/** Props for the TestConnectionButton component. */
type TestConnectionButtonProps = {
  /** Connection properties to test against. */
  connection: SqluiCore.CoreConnectionProps;
};

/** Status of the test connection attempt. */
type TestStatus = "loading" | "success" | "error" | "cancelled";

/** A parsed key-value detail from a connection string. */
type ConnectionDetail = {
  label: string;
  value: string;
};

/** Props for the modal body that displays connection test progress and results. */
type TestConnectionModalBodyProps = {
  /** Connection properties to test against. */
  connection: SqluiCore.CoreConnectionProps;
  /** Callback to dismiss the modal. */
  onDismiss: () => void;
};

/**
 * Parses a connection string into labeled key-value details using the same field definitions
 * as the Connection Helper form. Reverses the build logic from ConnectionHelper.
 * @param connectionString - The full connection string (e.g. "mysql://user:pass@host:3306").
 * @returns An array of labeled connection details.
 */
function parseConnectionDetails(connectionString: string): ConnectionDetail[] {
  try {
    const schemeMatch = connectionString.match(/^([^:]+):\/\//);
    if (!schemeMatch) {
      return [];
    }
    const scheme = schemeMatch[1];
    const body = connectionString.replace(`${scheme}://`, "");
    const format = getConnectionStringFormat(scheme);
    const formInputs = getConnectionFormInputs(scheme);

    if (formInputs.length === 0) {
      return [];
    }

    const details: ConnectionDetail[] = [];

    if (format === "json") {
      // JSON format: {"field1":"val1","field2":"val2"}
      try {
        const parsed = JSON.parse(body);
        for (const [inputKey, inputLabel] of formInputs) {
          if (parsed[inputKey]) {
            // Mask sensitive fields
            const isSensitive = /password|secret|token|key|clientId/i.test(inputKey);
            details.push({ label: inputLabel, value: isSensitive ? "••••••••" : parsed[inputKey] });
          }
        }
      } catch (_err) {
        // unparseable JSON
      }
    } else if (format === "ado") {
      // ADO format: Key1=val1;Key2=val2
      if (formInputs.length === 1) {
        // Single field (e.g. Azure Table Storage connection string) — show truncated
        const truncated = body.length > 40 ? body.substring(0, 40) + "…" : body;
        details.push({ label: formInputs[0][1], value: truncated });
      }
    } else {
      // URL format: user:pass@host:port
      if (body.includes("@")) {
        const [credentials, hostPart] = body.split("@");
        const [username] = credentials.split(":");
        if (username) {
          details.push({ label: "Username", value: decodeURIComponent(username) });
        }
        // Password is always masked
        if (credentials.includes(":")) {
          details.push({ label: "Password", value: "••••••••" });
        }
        const [host, portAndPath] = hostPart.split(":");
        if (host) {
          details.push({ label: "Host", value: decodeURIComponent(host) });
        }
        if (portAndPath) {
          const port = portAndPath.split("/")[0].split("?")[0];
          if (port) {
            details.push({ label: "Port", value: port });
          }
        }
      } else if (formInputs.length === 1) {
        // Single field (e.g. SQLite path)
        details.push({ label: formInputs[0][1], value: body });
      } else {
        // host:port without credentials
        const [host, portAndPath] = body.split(":");
        if (host) {
          details.push({ label: "Host", value: decodeURIComponent(host) });
        }
        if (portAndPath) {
          const port = portAndPath.split("/")[0].split("?")[0];
          if (port) {
            details.push({ label: "Port", value: port });
          }
        }
      }
    }

    return details;
  } catch (_err) {
    return [];
  }
}

/**
 * Formats elapsed milliseconds into a human-readable string (e.g. "1.2s" or "350ms").
 * @param ms - Elapsed time in milliseconds.
 * @returns Formatted duration string.
 */
function formatElapsed(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Renders a labeled metadata row for the test connection result.
 * @param props - Label and value to display.
 * @returns The metadata row element, or null if value is empty.
 */
function MetadataRow(props: { label: string; value: string }): JSX.Element | null {
  if (!props.value) {
    return null;
  }
  return (
    <Box sx={{ display: "flex", gap: 1, minWidth: 0 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0, maxWidth: 120 }}>
        {props.label}:
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-all", overflow: "hidden", minWidth: 0 }}>
        {props.value}
      </Typography>
    </Box>
  );
}

/**
 * Displays a live-updating elapsed timer that ticks every second.
 * @param props - Contains the start timestamp (epoch ms).
 * @returns The live timer element.
 */
function LiveTimer(props: { startTime: number }): JSX.Element {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  return <Typography variant="body2">{formatElapsed(now - props.startTime)}</Typography>;
}

/**
 * Modal body component that runs the connection test and shows loading (with live timer),
 * success, or error state with parsed connection details and Close/Retry/Cancel buttons.
 * @param props - Connection props and dismiss callback.
 * @returns The modal body element.
 */
export function TestConnectionModalBody(props: TestConnectionModalBodyProps): JSX.Element {
  const { connection, onDismiss } = props;
  const [status, setStatus] = useState<TestStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [dialect, setDialect] = useState("");
  const startTimeRef = useRef(Date.now());
  const abortControllerRef = useRef<AbortController | null>(null);

  const connectionDetails = parseConnectionDetails(connection.connection);

  const runTest = useCallback(async () => {
    // Abort any previous in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setStatus("loading");
    setErrorMessage("");
    setElapsed(0);
    setDialect("");
    startTimeRef.current = Date.now();
    try {
      const result = await ProxyApi.test(connection, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      setElapsed(Date.now() - startTimeRef.current);
      setDialect(result?.dialect || "");
      setStatus("success");
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      setElapsed(Date.now() - startTimeRef.current);
      console.error("TestConnectionButton:testConnection", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : JSON.stringify(err));
    }
  }, [connection]);

  /** Cancels the in-flight test connection request. */
  const onCancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setElapsed(Date.now() - startTimeRef.current);
    setStatus("cancelled");
  }, []);

  useEffect(() => {
    runTest();
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [runTest]);

  /** Renders the connection info rows (name + parsed connection details). */
  const renderConnectionInfo = () => (
    <>
      {connection.name && <MetadataRow label="Name" value={connection.name} />}
      {connectionDetails.map((detail, idx) => (
        <MetadataRow key={idx} label={detail.label} value={detail.value} />
      ))}
    </>
  );

  /** Renders the full metadata section with connection info, dialect, and elapsed time. */
  const renderMetadata = (showDialect: boolean) => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 0.5 }}>
      {renderConnectionInfo()}
      {showDialect && <MetadataRow label="Dialect" value={dialect} />}
      <MetadataRow label="Time" value={formatElapsed(elapsed)} />
    </Box>
  );

  return (
    <Box sx={{ py: 1 }}>
      {status === "loading" && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <CircularProgress size={24} />
            <Typography>Testing connection...</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1.5, ml: 0.5 }}>
            {renderConnectionInfo()}
            <Box sx={{ display: "flex", gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Elapsed:
              </Typography>
              <LiveTimer startTime={startTimeRef.current} />
            </Box>
          </Box>
        </Box>
      )}

      {status === "success" && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <CheckCircleOutlineIcon color="success" />
            <Typography>Successfully connected to Server.</Typography>
          </Box>
          {renderMetadata(true)}
        </Box>
      )}

      {status === "error" && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <ErrorOutlineIcon color="error" />
            <Typography>Failed to connect to Server.</Typography>
          </Box>
          {renderMetadata(false)}
          <Typography
            variant="body2"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              bgcolor: "action.hover",
              p: 1.5,
              borderRadius: 1,
              maxHeight: 200,
              overflow: "auto",
              mt: 1,
            }}
          >
            {errorMessage}
          </Typography>
        </Box>
      )}

      {status === "cancelled" && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <ErrorOutlineIcon color="warning" />
            <Typography>Connection test cancelled.</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 0.5 }}>
            <MetadataRow label="Time" value={formatElapsed(elapsed)} />
          </Box>
        </Box>
      )}

      {status === "loading" && (
        <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
          <Button variant="outlined" size="small" color="warning" onClick={onCancel}>
            Cancel
          </Button>
        </Box>
      )}

      {status !== "loading" && (
        <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
          {(status === "error" || status === "cancelled") && (
            <Button variant="contained" size="small" onClick={runTest}>
              Retry
            </Button>
          )}
          <Button variant="outlined" size="small" onClick={onDismiss}>
            Close
          </Button>
        </Box>
      )}
    </Box>
  );
}

/**
 * Opens the test connection modal dialog for a given connection.
 * Reusable by any component that has access to useActionDialogs.
 * @param connection - The connection properties to test.
 * @param modal - The modal function from useActionDialogs.
 * @param dismiss - The dismiss function from useActionDialogs.
 */
export function showTestConnectionModal(
  connection: SqluiCore.CoreConnectionProps,
  modal: ReturnType<typeof useActionDialogs>["modal"],
  dismiss: ReturnType<typeof useActionDialogs>["dismiss"],
) {
  modal({
    title: "Test Connection",
    message: <TestConnectionModalBody connection={connection} onDismiss={() => dismiss()} />,
    disableBackdropClick: true,
    size: "sm",
  });
}

/**
 * Button that tests a database connection and displays the result via a blocking modal dialog
 * with parsed connection details, live timer, cancel, and retry support.
 * @param props - Contains the connection properties to test.
 * @returns The test connection button.
 */
export default function TestConnectionButton(props: TestConnectionButtonProps): JSX.Element | null {
  const { modal, alert, dismiss } = useActionDialogs();

  const onTestConnection = async () => {
    if (!props.connection.connection) {
      try {
        await alert("Connection is required to perform testing.");
      } catch (_err) {
        // user dismissed dialog
      }
      return;
    }

    showTestConnectionModal(props.connection, modal, dismiss);
  };

  return (
    <>
      <Button type="button" onClick={() => onTestConnection()}>
        Test Connection
      </Button>
    </>
  );
}
