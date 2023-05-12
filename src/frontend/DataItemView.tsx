import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useParams } from 'react-router-dom';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import SimpleEditor from 'src/frontend/components/CodeEditorBox/SimpleEditor';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import ElectronEventListener from 'src/frontend/components/ElectronEventListener';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useDataItem } from 'src/frontend/hooks/useDataItem';

export default function DataView() {
  const urlParams = useParams();
  const dataItemGroupKey = urlParams.dataItemGroupKey as string;
  const { modal } = useActionDialogs();

  const { data, isLoading } = useDataItem(dataItemGroupKey);

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
          data={data}
          searchInputId='result-box-search-input'
          enableColumnFilter={true}
          fullScreen={true}
        />
      </Box>
      <ActionDialogs />
      <ElectronEventListener />
    </>
  );
}
