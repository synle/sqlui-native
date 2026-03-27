import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useTestConnection } from "src/frontend/hooks/useConnection";
import { SqluiCore } from "typings";

/** Props for the TestConnectionButton component. */
type TestConnectionButtonProps = {
  /** Connection properties to test against. */
  connection: SqluiCore.CoreConnectionProps;
};

/** Status of the test connection attempt. */
type TestStatus = "loading" | "success" | "error";

/** Props for the modal body that displays connection test progress and results. */
type TestConnectionModalBodyProps = {
  /** Connection properties to test against. */
  connection: SqluiCore.CoreConnectionProps;
  /** Callback to dismiss the modal. */
  onDismiss: () => void;
};

/**
 * Extracts the host portion from a connection string (e.g. "mysql://user:pass@host:3306" → "host:3306").
 * Returns the raw connection string segment after `@`, or falls back to the part after `://`.
 * @param connectionString - The full connection string.
 * @returns The extracted server host or an empty string if unparseable.
 */
function parseServerHost(connectionString: string): string {
  try {
    const withoutScheme = connectionString.replace(/^[^:]+:\/\//, "");
    // For JSON-style connections (e.g. sfdc://{"username":...}), return empty
    if (withoutScheme.startsWith("{")) {
      return "";
    }
    // For Microsoft-style connections (e.g. aztable://DefaultEndpointsProtocol=...)
    if (withoutScheme.includes(";")) {
      return "";
    }
    // Standard URL: user:pass@host:port/db or host:port/db
    const afterAt = withoutScheme.includes("@") ? withoutScheme.split("@")[1] : withoutScheme;
    // Remove path/query
    return afterAt.split("/")[0].split("?")[0];
  } catch (_err) {
    return "";
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
    <Box sx={{ display: "flex", gap: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
        {props.label}:
      </Typography>
      <Typography variant="body2">{props.value}</Typography>
    </Box>
  );
}

/**
 * Modal body component that runs the connection test and shows loading, success, or error state
 * with metadata (server, dialect, elapsed time) and Close/Retry buttons.
 * @param props - Connection props and dismiss callback.
 * @returns The modal body element.
 */
function TestConnectionModalBody(props: TestConnectionModalBodyProps): JSX.Element {
  const { connection, onDismiss } = props;
  const { mutateAsync: testConnection } = useTestConnection();
  const [status, setStatus] = useState<TestStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [dialect, setDialect] = useState("");
  const startTimeRef = useRef(0);

  const serverHost = parseServerHost(connection.connection);

  const runTest = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");
    setElapsed(0);
    setDialect("");
    startTimeRef.current = Date.now();
    try {
      const result = await testConnection(connection);
      setElapsed(Date.now() - startTimeRef.current);
      setDialect(result?.dialect || "");
      setStatus("success");
    } catch (err) {
      setElapsed(Date.now() - startTimeRef.current);
      console.error("TestConnectionButton:testConnection", err);
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : JSON.stringify(err));
    }
  }, [testConnection, connection]);

  useEffect(() => {
    runTest();
  }, [runTest]);

  return (
    <Box sx={{ py: 1 }}>
      {status === "loading" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <CircularProgress size={24} />
          <Typography>Testing connection...</Typography>
        </Box>
      )}

      {status === "success" && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
            <CheckCircleOutlineIcon color="success" />
            <Typography>Successfully connected to Server.</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 0.5 }}>
            {connection.name && <MetadataRow label="Name" value={connection.name} />}
            <MetadataRow label="Server" value={serverHost} />
            <MetadataRow label="Dialect" value={dialect} />
            <MetadataRow label="Time" value={formatElapsed(elapsed)} />
          </Box>
        </Box>
      )}

      {status === "error" && (
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <ErrorOutlineIcon color="error" />
            <Typography>Failed to connect to Server.</Typography>
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 0.5, mb: 1 }}>
            {connection.name && <MetadataRow label="Name" value={connection.name} />}
            <MetadataRow label="Server" value={serverHost} />
            <MetadataRow label="Time" value={formatElapsed(elapsed)} />
          </Box>
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
            }}
          >
            {errorMessage}
          </Typography>
        </Box>
      )}

      {status !== "loading" && (
        <Box sx={{ display: "flex", gap: 1, mt: 2, justifyContent: "flex-end" }}>
          {status === "error" && (
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
 * Button that tests a database connection and displays the result via a blocking modal dialog
 * with retry support on failure.
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

    modal({
      title: "Test Connection",
      message: <TestConnectionModalBody connection={props.connection} onDismiss={() => dismiss()} />,
      disableBackdropClick: true,
      size: "sm",
    });
  };

  return (
    <>
      <Button type="button" onClick={() => onTestConnection()}>
        Test Connection
      </Button>
    </>
  );
}
