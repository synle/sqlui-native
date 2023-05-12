import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import { useParams } from 'react-router-dom';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import { useDataItem } from 'src/frontend/hooks/useDataItem';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';

export default function DataView() {
  const urlParams = useParams();
  const dataItemGroupKey = urlParams.dataItemGroupKey as string;
  const { modal } = useActionDialogs();

  const { data, isLoading } = useDataItem(dataItemGroupKey);

  const onShowRecordDetails = async (rowData: any) => {
    try{
      await modal({
        title: 'Confirmation?',
        message: (
          <Paper sx={{height: '90vh', p: 1}}><pre>{JSON.stringify(rowData, null, 2)}</pre></Paper>
        ),
        showCloseButton: true,
        size: 'md',
      });
    }finally{}
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
    <Box sx={{ p: 1 }}>
      <DataTableWithJSONList
        onRowClick={onShowRecordDetails}
        rowContextOptions={rowContextOptions}
        data={data}
        searchInputId='result-box-search-input'
        enableColumnFilter={true}
        fullScreen={true}
      />
    </Box>
  );
}
