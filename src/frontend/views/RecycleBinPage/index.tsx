import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import RestoreIcon from '@mui/icons-material/Restore';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import VirtualizedConnectionTree from 'src/frontend/components/VirtualizedConnectionTree';
import DataTable from 'src/frontend/components/DataTable';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import {
  useDeletedRecycleBinItem,
  useGetRecycleBinItems,
  useRestoreRecycleBinItem,
} from 'src/frontend/hooks/useFolderItems';
import useToaster from 'src/frontend/hooks/useToaster';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { SqluiCore } from 'typings';

function NameCell({ row }: { row: any }) {
  const folderItem = row.original;
  const { mutateAsync: restoreRecycleBinItem } = useRestoreRecycleBinItem();
  return <Link onClick={() => restoreRecycleBinItem(folderItem)}>{folderItem.name}</Link>;
}

function TypeCell({ row }: { row: any }) {
  const folderItem = row.original;
  return (
    <Chip
      label={folderItem.type}
      color={folderItem.type === 'Connection' ? 'success' : 'warning'}
      size='small'
    />
  );
}

function ActionCell({ row }: { row: any }) {
  const folderItem = row.original;
  const { confirm } = useActionDialogs();
  const { mutateAsync: restoreRecycleBinItem } = useRestoreRecycleBinItem();
  const { mutateAsync: deleteRecyleBinItem } = useDeletedRecycleBinItem();

  const onRestoreRecycleBinItem = restoreRecycleBinItem;

  const onDeleteRecycleBin = async (folderItem: SqluiCore.FolderItem) => {
    try {
      await confirm(`Do you want to delete this item permanently "${folderItem.name}"?`);
      await deleteRecyleBinItem(folderItem.id);
    } catch (err) {}
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <IconButton aria-label='Restore item' onClick={() => onRestoreRecycleBinItem(folderItem)}>
        <RestoreIcon />
      </IconButton>
      <IconButton
        aria-label='Delete item permanently'
        onClick={() => onDeleteRecycleBin(folderItem)}>
        <DeleteForeverIcon />
      </IconButton>
    </Box>
  );
}

const columns: ColumnDef<any, any>[] = [
  {
    header: 'Name',
    accessorKey: 'name',
    cell: (info) => <NameCell row={info.row} />,
  },
  {
    header: 'Type',
    accessorKey: 'type',
    size: 100,
    cell: (info) => <TypeCell row={info.row} />,
  },
  {
    header: '',
    accessorKey: 'id',
    size: 80,
    cell: (info) => <ActionCell row={info.row} />,
  },
];

function RecycleBinItemList() {
  const { data, isLoading: loadingRecycleBinItems } = useGetRecycleBinItems();
  const { mutateAsync: deleteRecyleBinItem, isLoading: loadingRestoreQuery } =
    useDeletedRecycleBinItem();
  const { confirm } = useActionDialogs();
  const { add: addToast } = useToaster();
  const isLoading = loadingRecycleBinItems;

  const onEmptyTrash = async () => {
    try {
      await confirm(`Do you want to empty the recycle bin? This action cannot be undone.`);
      await Promise.all(
        (folderItems || []).map((folderItem) => deleteRecyleBinItem(folderItem.id)),
      );
      const curToast = await addToast({
        message: `Recycle Bin emptied.`,
      });
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
        <Typography variant='h6' sx={{ ml: 2 }}>
          Loading...
        </Typography>
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
    <LayoutTwoColumns className='Page Page__RecycleBin'>
      <>
        <NewConnectionButton />
        <VirtualizedConnectionTree />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <DeleteIcon fontSize='inherit' />
                  Recycle Bin
                </>
              ),
            },
          ]}
        />
        <Box className='FormInput__Container'>
          <RecycleBinItemList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
