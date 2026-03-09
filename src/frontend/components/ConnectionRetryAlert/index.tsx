import { Button } from "@mui/material";
import Alert from "@mui/material/Alert";
import { useState } from "react";
import { useRetryConnection } from "src/frontend/hooks/useConnection";
import useToaster from "src/frontend/hooks/useToaster";

/** Props for ConnectionRetryAlert. */
type ConnectionRetryAlertProps = {
  /** The ID of the connection to retry. */
  connectionId: string;
};

/**
 * Displays an error alert when a database connection fails, with a Reconnect button.
 * Shows a loading state while the reconnection attempt is in progress.
 * @param props - Contains the connectionId to retry.
 * @returns An alert element or null.
 */
export default function ConnectionRetryAlert(props: ConnectionRetryAlertProps): JSX.Element | null {
  const { connectionId } = props;
  const [retrying, setRetrying] = useState(false);
  const { mutateAsync: reconnectConnection } = useRetryConnection();
  const { add: addToast } = useToaster();

  const onReconnect = async (connectionId: string) => {
    setRetrying(true);
    try {
      await reconnectConnection(connectionId);
    } catch (err) {
      console.error("ConnectionRetryAlert:reconnectConnection", err);
      addToast({ id: connectionId, message: `Connection to ${connectionId} failed with ${err}` });
    } finally {
      setRetrying(false);
    }
  };

  if (retrying) {
    return (
      <Alert severity="info" icon={false}>
        Connecting to server...
      </Alert>
    );
  }

  return (
    <Alert
      severity="error"
      icon={false}
      action={
        <Button color="inherit" size="small" onClick={() => onReconnect(connectionId)} sx={{ fontSize: "0.7rem" }}>
          Reconnect
        </Button>
      }
    >
      Can't connect to server
    </Alert>
  );
}
