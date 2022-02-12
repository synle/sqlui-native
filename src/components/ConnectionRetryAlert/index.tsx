import { Button } from '@mui/material';
import Alert from '@mui/material/Alert';
import { useState } from 'react';
import { useRetryConnection } from 'src/hooks';

type ConnectionRetryAlertProps = {
  connectionId: string;
};

export default function ConnectionRetryAlert(props: ConnectionRetryAlertProps) {
  const { connectionId } = props;
  const [retrying, setRetrying] = useState(false);
  const { mutateAsync: reconnectConnection, isLoading: reconnecting } = useRetryConnection();

  const onReconnect = async (connectionId: string) => {
    setRetrying(true);
    try {
      await reconnectConnection(connectionId);
      setRetrying(false);
    } catch (err) {
      setRetrying(false);
    }
  };

  if (retrying) {
    return <Alert severity='info'>Connecting to server. Please wait....</Alert>;
  }

  return (
    <Alert
      severity='error'
      action={
        <Button color='inherit' size='small' onClick={() => onReconnect(connectionId)}>
          Reconnect
        </Button>
      }>
      Can't connect to this server
    </Alert>
  );
}
