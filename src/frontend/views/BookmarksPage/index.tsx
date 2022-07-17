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
import BookmarksItemList from 'src/frontend/components/BookmarksItemList';
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
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <BookmarksItemList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
