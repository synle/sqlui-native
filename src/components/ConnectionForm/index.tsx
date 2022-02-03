import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import { useGetConnectionById, useUpsertConnection } from 'src/hooks';
import TestConnectionButton from 'src/components/TestConnectionButton';
import Toast from 'src/components/Toast';
import { SqluiCore } from 'typings';
import SaveIcon from '@mui/icons-material/Save';

type ConnectionFormProps = {
  id?: string;
};

export function NewConnectionForm() {
  const [name, setName] = useState('');
  const [connection, setConnection] = useState('');
  const { mutateAsync, isLoading: saving } = useUpsertConnection();
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
  const { data: initialConnection, isLoading: loading } = useGetConnectionById(id);
  const { mutateAsync, isLoading: saving } = useUpsertConnection();
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
    setName(initialConnection?.name || '');
    setConnection(initialConnection?.connection || '');
  }, [initialConnection]);

  if (!loading && !initialConnection) {
    return (
      <Alert severity='error'>
        This connection couldn't be found. It might have been deleted....
        <strong onClick={() => navigate(`/`, { replace: true })} style={{ cursor: 'pointer' }}>
          Click here to go back to the main query page
        </strong>
      </Alert>
    );
  }

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
  const [showHint, setShowHint] = useState(false);

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
    return <Alert severity='info'>Loading connection. Please wait....</Alert>;
  }

  const connection: SqluiCore.CoreConnectionProps = {
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
      <div className='ConnectionForm__Row'>{showHint && <ConnectionHint />}</div>
      <div className='ConnectionForm__Row'>
        <Button
          variant='contained'
          type='submit'
          disabled={props.saving}
          startIcon={<SaveIcon />}
          sx={{ mr: 3 }}>
          Save
        </Button>
        <Button
          variant='outlined'
          type='button'
          disabled={props.saving}
          onClick={() => navigate('/')}
          sx={{ mr: 3 }}>
          Cancel
        </Button>
        <TestConnectionButton connection={connection} />
        {!showHint && (
          <Button
            type='button'
            disabled={props.saving}
            onClick={() => setShowHint(true)}
            sx={{ ml: 3 }}>
            Show Hints
          </Button>
        )}
      </div>
      <Toast open={toastOpen} onClose={() => setToastOpen(false)} message='Connection Saved...' />
    </form>
  );
}

function ConnectionHint() {
  return (
    <>
      <Alert severity='info' sx={{ mb: 2 }}>
        mysql://root:password@localhost:3306
      </Alert>
      <Alert severity='info' sx={{ mb: 2 }}>
        mariadb://root:password@localhost:3306
      </Alert>
      <Alert severity='info' sx={{ mb: 2 }}>
        mssql://sa:password123!@localhost:1433
      </Alert>
      <Alert severity='info' sx={{ mb: 2 }}>
        postgres://postgres:password@localhost:5432
      </Alert>
      <Alert severity='info' sx={{ mb: 2 }}>
        sqlite://test-db.sqlite
      </Alert>
      <Alert severity='info' sx={{ mb: 2 }}>
        cassandra://localhost:9042
      </Alert>
    </>
  );
}
