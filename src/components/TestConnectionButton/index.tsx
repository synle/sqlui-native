import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import { useTestConnection } from 'src/hooks';
import Toast from 'src/components/Toast';
import { Sqlui } from 'typings';

interface TestConnectionButtonProps {
  connection: Sqlui.CoreConnectionProps;
}

export default function TestConnectionButton(props: TestConnectionButtonProps) {
  const [message, setMessage] = useState('');
  const { mutateAsync: testConnection } = useTestConnection();

  const onTestConnection = async () => {
    // const connectionMetadata = {};
    try {
      await testConnection(props.connection);
      setMessage(`Successfully connected to Server`);
    } catch (err) {
      setMessage(`Failed to connect to Server`);
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
