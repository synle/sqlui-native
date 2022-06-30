import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RestoreIcon from '@mui/icons-material/Restore';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useEffect , useState} from 'react';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import DataTable from 'src/frontend/components/DataTable';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import {
  useDeletedRecycleBinItem,
  useGetRecycleBinItems,
  useRestoreRecycleBinItem,
} from 'src/frontend/hooks/useFolderItems';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { SqluiCore, SqluiFrontend } from 'typings';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import { useNavigate, useSearchParams } from 'react-router-dom';
import BackupIcon from '@mui/icons-material/Backup';

type RecordData = any;

type RecordFormProps = {
  onSave: (item: RecordData) => void;
  onCancel:()=> void;
  query?: SqluiCore.ConnectionQuery;
  data?: RecordData;
}

function RecordForm(props){
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState<Partial<SqluiFrontend.ConnectionQuery>>({
    id: 'migration_from_query_' + Date.now(),
    ...props?.query
  });

  const isDisabled = true;

  const onDatabaseConnectionChange = (
    connectionId?: string,
    databaseId?: string,
    tableId?: string,
  ) => {
    setQuery({
      ...query,
      connectionId,
      databaseId,
      tableId,
    });
  };


   useEffect(() => {
    setSearchParams(
      {
        connectionId: query.connectionId || '',
        databaseId: query.databaseId || '',
        tableId: query.tableId || '',
      },
      { replace: true },
    );
  }, [query]);

   useEffect(() => {
    setQuery({
      ...query,
      connectionId: searchParams.get('connectionId') || '',
      databaseId: searchParams.get('databaseId') || '',
      tableId: searchParams.get('tableId') || '',
    });

  }, []);

  return <>
    <div className='FormInput__Row'>
    <ConnectionDatabaseSelector
      isTableIdRequired={true}
      value={query}
      onChange={onDatabaseConnectionChange}
    /></div>

  {/*TODO: render the real form here*/}

    <div className='FormInput__Row'>
    <Button
      variant='contained'
      type='submit'
      disabled={isDisabled}
      startIcon={<BackupIcon />}
      onClick={props.onSave}>
      Save
    </Button>
    <Button variant='outlined' type='button' disabled={isDisabled} onClick={props.onCancel}>
      Cancel
    </Button>
    </div>
  </>
}

export function NewRecordPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const navigate = useNavigate();

  const onSave=  (item: RecordData) => {

  }

  const onCancel=  () => {

  }

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='NewRecordPage'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <DeleteIcon fontSize='inherit' />
                  New Record
                </>
              ),
            },
          ]}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <RecordForm onSave={onSave} onCancel={onCancel} />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}



export function EditRecordPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const navigate = useNavigate();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='EditRecordPage'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <DeleteIcon fontSize='inherit' />
                  Edit Record
                </>
              ),
            },
          ]}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {/*<RecordForm />*/}
        </Box>
      </>
    </LayoutTwoColumns>
  );
}

