import { Button } from '@mui/material';
import { useState } from 'react';
import { useTestConnection } from 'src/frontend/hooks/useConnection';
import useToaster from 'src/frontend/hooks/useToaster';
import { SqluiCore } from 'typings';

type TestConnectionButtonProps = {
  connection: SqluiCore.CoreConnectionProps;
};

export default function TestConnectionButton(props: TestConnectionButtonProps) {
  const [message, setMessage] = useState('');
  const { mutateAsync: testConnection } = useTestConnection();
  const { add: addToast, dismiss: dismissToast } = useToaster();
  const toastId = `toast.connectionCheck.${props.connection.connection}`;

  const onTestConnection = async () => {
    let message = '';

    await addToast({
      id: toastId,
      message: 'Checking connection...',
    });

    if (!props.connection.connection) {
      message = `Connection is required to perform testing.`;
    } else {
      try {
        await testConnection(props.connection);
        message = `Successfully connected to Server.`;
      } catch (err) {
        message = `Failed to connect to Server. ${JSON.stringify(err)}.`;
      }
    }

    if (message) {
      await dismissToast(toastId);
      await addToast({
        id: toastId,
        message,
      });
    }
  };

  return (
    <>
      <Button type='button' onClick={() => onTestConnection()}>
        Test Connection
      </Button>
    </>
  );
}
