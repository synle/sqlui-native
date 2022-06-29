import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RestoreIcon from '@mui/icons-material/Restore';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import DataTable from 'src/frontend/components/DataTable';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { useDeletedRecycleBinItem, useGetRecycleBinItems } from 'src/frontend/hooks/useFolderItems';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { SqluiCore } from 'typings';

const columns = [
  {
    Header: 'Name',
    accessor: 'name',
  },
  {
    Header: 'Type',
    accessor: 'type',
    Cell: (data: any) => {
      const folderItem = data.row.original;
      return (
        <Chip
          label={folderItem.type}
          color={folderItem.type === 'Connection' ? 'success' : 'warning'}
          size='small'
        />
      );
    },
  },
  {
    Header: '',
    accessor: 'id',
    Cell: (data: any) => {
      const folderItem = data.row.original;
      const { onAddQuery } = useConnectionQueries();
      const { mutateAsync: deleteRecyleBinItem } = useDeletedRecycleBinItem();
      const navigate = useNavigate();
      const { confirm } = useActionDialogs();
      const { mutateAsync: upsertConnection } = useUpsertConnection();

      const onRestoreRecycleBinItem = async (folderItem: SqluiCore.FolderItem) => {
        // here we handle restorable
        switch (folderItem.type) {
          case 'Connection':
            await Promise.all([
              upsertConnection(folderItem.data),
              deleteRecyleBinItem(folderItem.id),
            ]);
            navigate('/'); // navigate back to the main page
            break;
          case 'Query':
            // TODO: add check and handle restore of related connection
            await Promise.all([onAddQuery(folderItem.data), deleteRecyleBinItem(folderItem.id)]);
            navigate('/'); // navigate back to the main page
            break;
        }
      };

      const onDeleteRecycleBin = async (folderItem: SqluiCore.FolderItem) => {
        try {
          await confirm(`Do you want to delete this item permanently "${folderItem.name}"?`);
          await deleteRecyleBinItem(folderItem.id);
        } catch (err) {}
      };

      return (
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            onClick={() => onRestoreRecycleBinItem(folderItem)}
            variant='contained'
            size='small'
            startIcon={<RestoreIcon />}>
            Restore
          </Button>
          <Button
            onClick={() => onDeleteRecycleBin(folderItem)}
            variant='outlined'
            size='small'
            color='error'
            startIcon={<DeleteForeverIcon />}>
            Delete
          </Button>
        </Box>
      );
    },
  },
];
function RecycleBinItemList() {
  const { data, isLoading: loadingRecycleBinItems } = useGetRecycleBinItems();
  const { mutateAsync: deleteRecyleBinItem, isLoading: loadingRestoreQuery } =
    useDeletedRecycleBinItem();
  const { confirm } = useActionDialogs();
  const isLoading = loadingRecycleBinItems;

  const onEmptyTrash = async () => {
    try {
      await confirm(`Do you want to empty the recycle bin? This action cannot be undone.`);
      await Promise.all(
        (folderItems || []).map((folderItem) => deleteRecyleBinItem(folderItem.id)),
      );
    } catch (err) {}
  };

  if (isLoading) {
    return (
      <Backdrop
        open={true}
        sx={{
          bgcolor: 'background.paper',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}>
        <CircularProgress />
        <Typography variant='h6'>Loading...</Typography>
      </Backdrop>
    );
  }

  const folderItems = data || [];
  if (folderItems.length === 0) {
    return <Typography>Recycle Bin is empty...</Typography>;
  }
  return (
    <>
      <Box>
        <Link onClick={() => onEmptyTrash()}>Empty Trash</Link>
      </Box>
      <DataTable data={folderItems} columns={columns} />
    </>
  );
}
export default function RecycleBinPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const navigate = useNavigate();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='MainPage'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: 'Recycle Bin',
            },
          ]}
        />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <RecycleBinItemList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
