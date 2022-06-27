import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { useDeletedRecycleBinItem, useGetRecycleBinItems } from 'src/frontend/hooks/useFolderItems';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { SqluiCore } from 'typings';
function RecycleBinItemList() {
  const { data, isLoading: loadingRecycleBinItems } = useGetRecycleBinItems();
  const { onAddQuery } = useConnectionQueries();
  const { mutateAsync: deleteRecyleBinItem, isLoading: loadingRestoreQuery } =
    useDeletedRecycleBinItem();
  const navigate = useNavigate();
  const { confirm } = useActionDialogs();
  const { mutateAsync: upsertConnection, isLoading: loadingRestoreConnection } =
    useUpsertConnection();

  const onRestoreRecycleBinItem = async (folderItem: SqluiCore.FolderItem) => {
    // here we handle restorable
    switch (folderItem.type) {
      case 'Connection':
        await Promise.all([upsertConnection(folderItem.data), deleteRecyleBinItem(folderItem.id)]);
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

  const onEmptyTrash = async () => {
    try {
      await confirm(`Do you want to empty the recycle bin? This action cannot be undone.`);
      await Promise.all(
        (folderItems || []).map((folderItem) => deleteRecyleBinItem(folderItem.id)),
      );
    } catch (err) {}
  };

  const isLoading = loadingRecycleBinItems || loadingRestoreConnection || loadingRestoreConnection;

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
      {folderItems.map((folderItem) => {
        return (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }} key={folderItem.id}>
            <Typography>{folderItem.name}</Typography>
            <Typography>{folderItem.type}</Typography>
            <Button onClick={() => onRestoreRecycleBinItem(folderItem)} variant='contained'>
              Restore
            </Button>
            <Button onClick={() => onDeleteRecycleBin(folderItem)} variant='outlined'>
              Delete
            </Button>
          </Box>
        );
      })}
      <Box>
        <Button onClick={() => onEmptyTrash()} variant='contained'>
          Empty Trash
        </Button>
      </Box>
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
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          Recycle Bin
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <RecycleBinItemList />
          <Box>
            <Link onClick={() => navigate('/')} underline='none'>
              Back to Main Query Page
            </Link>
          </Box>
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
