import React, { useState } from 'react';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import { useTestConnection } from 'src/hooks';
import { Sqlui } from 'typings';

interface TestConnectionButtonProps {
  connection: Sqlui.CoreConnectionProps;
}

export default function TestConnectionButton(props: TestConnectionButtonProps) {
  const { mutateAsync: testConnection } = useTestConnection();

  const onTestConnection = async () => {
    // const connectionMetadata = {};
    try {
      await testConnection(props.connection);
      alert('good connection');
    } catch (err) {
      alert('bad connection');
    }
  };

  return (
    <Button type='button' onClick={() => onTestConnection()}>
      Test Connection
    </Button>
  );
}
