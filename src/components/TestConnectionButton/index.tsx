import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import { useTestConnection } from 'src/hooks';
import Toast from 'src/components/Toast';
import { SqluiCore } from 'typings';

interface TestConnectionButtonProps {
  connection: SqluiCore.CoreConnectionProps;
}

export default function TestConnectionButton(props: TestConnectionButtonProps) {
  const [message, setMessage] = useState('');
  const { mutateAsync: testConnection } = useTestConnection();

  const onTestConnection = async () => {
    if(!props.connection.connection){
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
