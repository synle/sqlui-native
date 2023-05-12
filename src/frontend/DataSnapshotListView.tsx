import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
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
import { useGetDataSnapshots, useDeleteDataSnapshot } from 'src/frontend/hooks/useDataSnapshot';
import {useEffect} from 'react';
import DataTable from 'src/frontend/components/DataTable';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import { Link as RouterLink } from 'react-router-dom';

const columns = [
  {
    Header: 'ID',
    accessor: 'id',
    Cell: (data: any) => {
      const dataSnapshot = data.row.original;
      const linkToUse = `/data-snapshot/${dataSnapshot.id}`
      return <Link component={RouterLink}
              to={linkToUse}>{dataSnapshot.id}</Link>;
    },
  },
  {
    Header: 'Description',
    accessor: 'description',
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

export default function() {
  const { modal } = useActionDialogs();

  const { data, isLoading } = useGetDataSnapshots();


  useEffect(() => {
    window.document.title = `Data Snapshots`;
  }, [])

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

  return <>
    <DataTable data={data} columns={columns} />
  </>
}
