import { Button } from "@mui/material";
import Alert from "@mui/material/Alert";
import { useState } from "react";
import { useRetryConnection } from "src/frontend/hooks/useConnection";
import useToaster from "src/frontend/hooks/useToaster";

type ConnectionRetryAlertProps = {
  connectionId: string;
};

export default function ConnectionRetryAlert(props: ConnectionRetryAlertProps): JSX.Element | null {
  const { connectionId } = props;
  const [retrying, setRetrying] = useState(false);
  const { mutateAsync: reconnectConnection, isLoading: reconnecting } = useRetryConnection();
  const { add: addToast } = useToaster();

  const onReconnect = async (connectionId: string) => {
    setRetrying(true);
    try {
      await reconnectConnection(connectionId);
    } catch (err) {
      addToast({ id: `retry.connection.${connectionId}`, message: `Connection to ${connectionId} failed with ${err}` });
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
