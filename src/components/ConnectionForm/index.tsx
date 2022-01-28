import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import { useGetMetaData, useUpsertConnection, useGetConnection } from 'src/hooks';
import TestConnectionButton from 'src/components/TestConnectionButton';
import Toast from 'src/components/Toast';
import { Sqlui } from 'typings';

type ConnectionFormProps = {
  id?: string;
};

export function NewConnectionForm() {
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const { data: upsertedConnection, mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    const newConnection = await mutateAsync({
      name,
      connection,
    });

    // when done, go back to the main page
    navigate(`/`, { replace: true });
  };

  return (
    <MainConnectionForm
      onSave={onSave}
      name={name}
      setName={setName}
      connection={connection}
      setConnection={setConnection}
      saving={saving}
    />
  );
}

export function EditConnectionForm(props: ConnectionFormProps) {
  const { id } = props;
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const { data: connections, isLoading: loading } = useGetMetaData();
  const connectionProps = useGetConnection(id, connections);
  const { data: upsertedConnection, mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    await mutateAsync({
      id,
      name,
      connection,
    });

    // when done, go back to the main page
    navigate(`/`, { replace: true });
  };

  // set the data for existing form
  useEffect(() => {
    setName(connectionProps?.name || '');
    setConnection(connectionProps?.connection || '');
  }, [connectionProps]);

  return (
    <MainConnectionForm
      onSave={onSave}
      name={name}
      setName={setName}
      connection={connection}
      setConnection={setConnection}
      saving={saving}
      loading={loading}
    />
  );
}

interface MainConnectionFormProps {
  onSave: () => Promise<void>;
  name: string;
  setName: (newVal: string) => void;
  connection: string;
  setConnection: (newVal: string) => void;
  saving?: boolean;
  loading?: boolean;
}

function MainConnectionForm(props: MainConnectionFormProps) {
  const navigate = useNavigate();
  const [toastOpen, setToastOpen] = useState(false);

  const onSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setToastOpen(true);
    try {
      await props.onSave();
      // setToastOpen(false)
    } catch (err) {
      // setToastOpen(false)
    }
  };

  if (props.loading) {
    return <>loading...</>;
  }

  const connection: Sqlui.CoreConnectionProps = {
    name: props.name,
    connection: props.connection,
  };

  return (
    <form className='ConnectionForm' onSubmit={onSave}>
      <div className='ConnectionForm__Row'>
        <TextField
          label='Name'
          value={props.name}
          onChange={(e) => props.setName(e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='ConnectionForm__Row'>
        <TextField
          label='Connection'
          value={props.connection}
          onChange={(e) => props.setConnection(e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='ConnectionForm__ActionRow'>
        <Button variant='contained' type='submit' disabled={props.saving}>
          Save
        </Button>
        <Button
          variant='outlined'
          type='button'
          disabled={props.saving}
          onClick={() => navigate('/')}>
          Cancel
        </Button>
        <TestConnectionButton connection={connection} />
      </div>
      <Toast open={toastOpen} onClose={() => setToastOpen(false)} message='Connection Saved...' />
    </form>
  );
}
