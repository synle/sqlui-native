import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import { NewConnectionForm } from 'src/frontend/components/ConnectionForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { useGetRecycleBinItems } from 'src/frontend/hooks/useFolderItems';
import { SqluiCore, SqluiFrontend } from 'typings';


function RecycleBinItemList(){
  const {data: folderItems, isLoading} = useGetRecycleBinItems();

  const onRestore = (folderItem: SqluiCore.FolderItem) => {

  }

  if(isLoading){
    // TODO: make a more fancy loading...
    return <Typography>Loading...</Typography>
  }

  if(folderItems?.length === 0){
     return <Typography>Recycle Bin is empty...</Typography>
  }

  return <Box sx={{display:"flex", flexDirection: 'column', gap: 2}}>
    {folderItems?.map(folderItem => {
      return <Box sx={{display:"flex", gap: 2}} key={folderItem.id}>
        <Typography>{folderItem.name}</Typography>
        <Typography>{folderItem.type}</Typography>
        <Button onClick={() => onRestore(folderItem)}>Restore</Button>
      </Box>
    })}
  </Box>
}



export default function RecycleBinPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();

  const { setTreeActions } = useTreeActions();

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
        <RecycleBinItemList />
      </>
    </LayoutTwoColumns>
  );
}
