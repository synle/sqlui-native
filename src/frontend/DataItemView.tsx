import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { useParams } from 'react-router-dom';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import { useDataItem } from 'src/frontend/hooks/useDataItem';

export default function DataView() {
  const urlParams = useParams();
  const dataItemGroupKey = urlParams.dataItemGroupKey as string;

  const { data, isLoading } = useDataItem(dataItemGroupKey);

  const onShowRecordDetails = (rowData: any) => {
    // TODO:
    console.log(rowData);
  };

  const rowContextOptions = [
    // TODO:
    // {
    //   label: 'Show Details',
    //   onClick: onShowRecordDetails,
    // },
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
