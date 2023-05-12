import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import InputLabel from '@mui/material/InputLabel';
import Fab from '@mui/material/Fab';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useParams } from 'react-router-dom';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import SimpleEditor from 'src/frontend/components/CodeEditorBox/SimpleEditor';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import ElectronEventListener from 'src/frontend/components/ElectronEventListener';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useGetDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';
import {useEffect} from 'react';
import { useNavigate } from 'react-router-dom';

export default function() {
  const navigate = useNavigate();
  const urlParams = useParams();
  const dataSnapshotId = urlParams.dataSnapshotId as string;
  const { modal } = useActionDialogs();

  const { data, isLoading } = useGetDataSnapshot(dataSnapshotId);

  const onShowRecordDetails = async (rowData: any) => {
    try {
      await modal({
        title: 'Record Details',
        message: <SimpleEditor value={JSON.stringify(rowData, null, 2)} height='85vh' />,
        showCloseButton: true,
        size: 'lg',
      });
    } finally {
    }
  };

  const onShowDescription = async () => {
    if(!data){
      return
    }

    try {
      await modal({
        title: 'Data Description',
        message: <>
          <InputLabel>ID</InputLabel>
          <pre>{data.id}</pre>
          <InputLabel>Total</InputLabel>
          <pre>{data.values?.length || 0}</pre>
          <InputLabel>Description</InputLabel>
          <pre>{data.description}</pre>
        </>,
        showCloseButton: true,
        size: 'lg',
      });
    } finally {
    }
  };

  const onGoToDataSnapshotList = async () => {
      navigate('/data-snapshot')
  };

  const rowContextOptions = [
    {
      label: 'Show Details',
      onClick: onShowRecordDetails,
    },
  ];

  useEffect(() => {
    window.document.title = `Data Snapshot ${data?.description || ''}`.trim();
  }, [data])

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!data) {
    return <Alert severity='error'>No data for this snapshot</Alert>;
  }

  return (
    <>
      <Box
        className='DataSnapshotView'
        sx={{
          px: 1,
        }}>
        <DataTableWithJSONList
          onRowClick={onShowRecordDetails}
          rowContextOptions={rowContextOptions}
          data={data.values}
          searchInputId='result-box-search-input'
          enableColumnFilter={true}
          fullScreen={true}
        />
      </Box>
      <Fab size='small' sx={{
    position: 'fixed',
    bottom: '1rem',
    left: '1.5rem',
  }} onClick={() => onGoToDataSnapshotList()}>
        <KeyboardArrowLeftIcon />
      </Fab>

      <Fab size='small' sx={{
    position: 'fixed',
    bottom: '1rem',
    right: '1.5rem',
  }} onClick={() => onShowDescription()}>
        <KeyboardArrowUpIcon />
      </Fab>
    </>
  );
}
