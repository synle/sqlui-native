import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
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
import { useDataSnapshot } from 'src/frontend/hooks/useDataItem';

export default function DataView() {
  const urlParams = useParams();
  const dataItemGroupKey = urlParams.dataItemGroupKey as string;
  const { modal } = useActionDialogs();

  const { data, isLoading } = useDataSnapshot(dataItemGroupKey);

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

  const rowContextOptions = [
    {
      label: 'Show Details',
      onClick: onShowRecordDetails,
    },
  ];

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!data) {
    return <Alert severity='error'>No data</Alert>;
  }

  return (
    <>
      <Box
        className='DataItemView'
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
  }} onClick={() => onShowDescription()}>
        <KeyboardArrowRightIcon />
      </Fab>
      <ActionDialogs />
      <ElectronEventListener />
    </>
  );
}
