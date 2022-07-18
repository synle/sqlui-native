import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditIcon from '@mui/icons-material/Edit';
import StarIcon from '@mui/icons-material/Star';
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
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import DataTable from 'src/frontend/components/DataTable';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useUpsertConnection } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import {
  useDeleteBookmarkItem,
  useGetBookmarkItems,
  useUpdateBookmarkItem,
} from 'src/frontend/hooks/useFolderItems';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { SqluiCore } from 'typings';

const columns = [
  {
    Header: 'Name',
    accessor: 'name',
    Cell: (data: any) => {
      const folderItem = data.row.original;
      const { onAddQuery } = useConnectionQueries();
      const navigate = useNavigate();
      const { confirm, prompt } = useActionDialogs();
      const { mutateAsync: upsertConnection } = useUpsertConnection();
      const onOpenBookmarkItem = async (folderItem: SqluiCore.FolderItem) => {
        // here we handle restorable
        switch (folderItem.type) {
          case 'Connection':
            await upsertConnection(folderItem.data);
            navigate('/'); // navigate back to the main page
            break;
          case 'Query':
            // TODO: add check and handle restore of related connection
            await onAddQuery(folderItem.data);
            navigate('/'); // navigate back to the main page
            break;
        }
      };

      return <Link onClick={() => onOpenBookmarkItem(folderItem)}>{folderItem.name}</Link>;
    },
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
    width: 80,
    Cell: (data: any) => {
      const folderItem = data.row.original;
      const { onAddQuery } = useConnectionQueries();
      const navigate = useNavigate();
      const { confirm, prompt } = useActionDialogs();
      const { mutateAsync: upsertConnection } = useUpsertConnection();
      const { mutateAsync: deleteBookmarkItem } = useDeleteBookmarkItem();
      const { mutateAsync: updateBookmarkItem } = useUpdateBookmarkItem();

      const onEditBookmark = async (folderItem: SqluiCore.FolderItem) => {
        try {
          const newName = await prompt({
            title: 'Bookmark name?',
            message: 'A bookmark name',
            value: folderItem.name,
            saveLabel: 'Save',
          });

          folderItem.name = newName;

          await updateBookmarkItem(folderItem);
        } catch (err) {}
      };

      const onDeleteBookmarkItem = async (folderItem: SqluiCore.FolderItem) => {
        try {
          await confirm(`Do you want to delete this boookmark "${folderItem.name}"?`);
          await deleteBookmarkItem(folderItem.id);
        } catch (err) {}
      };

      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton aria-label='Edit bookmark' onClick={() => onEditBookmark(folderItem)}>
            <EditIcon />
          </IconButton>
          <IconButton aria-label='Delete bookmark' onClick={() => onDeleteBookmarkItem(folderItem)}>
            <DeleteForeverIcon />
          </IconButton>
        </Box>
      );
    },
  },
];
function BookmarksItemList() {
  const navigate = useNavigate();
  const { data, isLoading: loadingRecycleBinItems } = useGetBookmarkItems();
  const { mutateAsync: deleteRecyleBinItem, isLoading: loadingRestoreQuery } =
    useDeleteBookmarkItem();
  const { confirm } = useActionDialogs();

  const isLoading = loadingRecycleBinItems;

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
    return <Typography>No bookmarks...</Typography>;
  }
  return (
    <>
      <DataTable data={folderItems} columns={columns} />
    </>
  );
}

export default function BookmarksPage() {
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='Page Page__Bookmarks'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <StarIcon fontSize='inherit' />
                  Bookmarks
                </>
              ),
            },
          ]}
        />
        <Box className='FormInput__Container'>
          <BookmarksItemList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
