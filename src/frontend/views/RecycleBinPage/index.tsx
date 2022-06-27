import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import Box from '@mui/material/Box';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import { NewConnectionForm } from 'src/frontend/components/ConnectionForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { useGetRecycleBinItems, useDeletedRecycleBinItem } from 'src/frontend/hooks/useFolderItems';
import { SqluiCore, SqluiFrontend } from 'typings';
import { useNavigate } from 'react-router-dom';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';

function RecycleBinItemList(){
  const {data, isLoading} = useGetRecycleBinItems();
  const { onAddQuery } = useConnectionQueries();
  const {mutateAsync: deleteRecyleBinItem} = useDeletedRecycleBinItem();
  const navigate = useNavigate();
  const { confirm } = useActionDialogs();

  const onRestoreRecycleBinItem = async (folderItem: SqluiCore.FolderItem) => {
    // here we handle restorable
    switch(folderItem.type){
      case 'Connection':
        // TODO: implement me - connection restore
        break;
      case 'Query':
        // TODO: add check and handle restore of related connection
        onAddQuery(folderItem.data);
        navigate('/'); // navigate back to the main page
        await deleteRecyleBinItem(folderItem.id);
        break;
    }
  }

  const onDeleteRecycleBin = async (folderItem: SqluiCore.FolderItem) => {
    try {
      await confirm(`Do you want to delete this item permanently "${folderItem.name}"?`);
      await deleteRecyleBinItem(folderItem.id);
    } catch (err) {}
  }

  const onEmptyTrash = async () => {
    try {
      await confirm(`Do you want to empty the recycle bin? This action cannot be undone.`);
      await Promise.all(
        (folderItems || []).map(folderItem => deleteRecyleBinItem(folderItem.id))
      );
    } catch (err) {}
  }


  if(isLoading){
    // TODO: make a more fancy loading...
    return <Typography>Loading...</Typography>
  }

  // right now only showing query in recycle bin
  // TODO: implement me - connection restore
  const folderItems = (data || []).filter(folderItem => folderItem.type === 'Query');

  if(folderItems.length === 0){
     return <Typography>Recycle Bin is empty...</Typography>
  }

  return <>
    {folderItems.map(folderItem => {
      return <Box sx={{display:"flex", gap: 2, alignItems: 'center'}} key={folderItem.id}>
        <Typography>{folderItem.name}</Typography>
        <Typography>{folderItem.type}</Typography>
        <Button  onClick={() => onRestoreRecycleBinItem(folderItem)} variant="contained">Restore</Button>
        <Button  onClick={() => onDeleteRecycleBin(folderItem)} variant="outlined">Delete</Button>
      </Box>
    })}
    <Box>
      <Button  onClick={() => onEmptyTrash()} variant="contained">Empty Trash</Button>
    </Box>
  </>
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
        <Box sx={{display:"flex", flexDirection: 'column', gap: 2}}>
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
