import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect } from 'react';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import DataTable from 'src/frontend/components/DataTable';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useDeleteDataSnapshot, useGetDataSnapshots } from 'src/frontend/hooks/useDataSnapshot';

const columns = [
  {
    Header: 'ID',
    accessor: 'id',
    Cell: (data: any) => {
      const dataSnapshot = data.row.original;
      const linkToUse = `/data_snapshot/${dataSnapshot.id}`;
      return (
        <Link component={RouterLink} to={linkToUse}>
          {dataSnapshot.id}
        </Link>
      );
    },
  },
  {
    Header: 'Location',
    accessor: 'location',
  },
  {
    Header: 'Description',
    accessor: 'description',
  },
  {
    Header: 'Created',
    accessor: 'created',
    width: '180px',
    Cell: (data: any) => {
      const dataSnapshot = data.row.original;
      return new Date(dataSnapshot.created).toLocaleString();
    }
  },
  {
    Header: '',
    id: 'action',
    width: 80,
    Cell: (data: any) => {
      const dataSnapshot = data.row.original;
      const { confirm } = useActionDialogs();
      const { mutateAsync: deleteRecord } = useDeleteDataSnapshot();

      const onDeleteRecycleBin = async (dataSnapshotId: string) => {
        try {
          await confirm(`Do you want to delete this item permanently "${dataSnapshotId}"?`);
          await deleteRecord(dataSnapshotId);
        } catch (err) {}
      };

      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            aria-label='Delete item permanently'
            onClick={() => onDeleteRecycleBin(dataSnapshot.id)}>
            <DeleteForeverIcon />
          </IconButton>
        </Box>
      );
    },
  },
];

export default function DataSnapshotListView() {
  const { data, isLoading } = useGetDataSnapshots();
  useEffect(() => {
    window.document.title = `Data Snapshots`;
  }, []);

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (!data || data.length === 0) {
    return <Alert severity='error'>No data snapshot available</Alert>;
  }

  return (
    <>
      <DataTable data={data} columns={columns} />
    </>
  );
}
