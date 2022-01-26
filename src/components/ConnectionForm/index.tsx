import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import { useUpsertConnection, useGetConnection } from 'src/hooks';

type ConnectionFormProps = {
  id?: string;
};

export function NewConnectionForm() {
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const { data: upsertedConnection, mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    const newConnection = await mutateAsync({
      name,
      connection,
    });

    navigate(`/connection/edit/${newConnection.id}`, { replace: true });
  };

  return (
    <form className='ConnectionForm' onSubmit={onSave}>
      <div>
        <label>Name:</label>
        <input type='text' value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label>Connection:</label>
        <input
          type='text'
          value={connection}
          onChange={(e) => setConnection(e.target.value)}
          required
        />
      </div>
      <div>
        <Button variant='contained' type='submit' disabled={saving}>
          Save
        </Button>
        <Button variant='outlined' type='button' disabled={saving} onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function EditConnectionForm(props: ConnectionFormProps) {
  const { id } = props;
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const { data: connectionProps, isLoading: loading } = useGetConnection(id);
  const { data: upsertedConnection, mutateAsync, isLoading: saving } = useUpsertConnection();
  const navigate = useNavigate();

  const onSave = async () => {
    mutateAsync({
      id,
      name,
      connection,
    });
  };

  // set the data for existing form
  useEffect(() => {
    setName(connectionProps?.name || '');
    setConnection(connectionProps?.connection || '');
  }, [connectionProps]);

  if (loading) {
    return <>loading...</>;
  }

  return (
    <form className='ConnectionForm' onSubmit={onSave}>
      <div>
        <label>Name:</label>
        <input type='text' value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label>Connection:</label>
        <input
          type='text'
          value={connection}
          onChange={(e) => setConnection(e.target.value)}
          required
        />
      </div>
      <div>
        <Button variant='contained' type='submit' disabled={saving}>
          Save
        </Button>
        <Button variant='outlined' type='button' disabled={saving} onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
