import { Button } from '@mui/material';
import { useState } from 'react';
import Toast from 'src/frontend/components/Toast';
import { useTestConnection } from 'src/frontend/hooks/useConnection';
import { SqluiCore } from 'typings';

type TestConnectionButtonProps = {
  connection: SqluiCore.CoreConnectionProps;
};

export default function TestConnectionButton(props: TestConnectionButtonProps) {
  const [message, setMessage] = useState('');
  const { mutateAsync: testConnection } = useTestConnection();

  const onTestConnection = async () => {
    if (!props.connection.connection) {
      return setMessage(`Connection is required to perform testing.`);
    }
    try {
      await testConnection(props.connection);
      setMessage(`Successfully connected to Server`);
    } catch (err) {
      setMessage(`Failed to connect to Server. ${err}`);
    }
  };

  return (
    <>
      <Button type='button' onClick={() => onTestConnection()}>
        Test Connection
      </Button>
      <Toast open={!!message} onClose={() => setMessage('')} message={message} />
    </>
  );
}