import StarIcon from '@mui/icons-material/Star';
import { Box, Link, Skeleton } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import {
  getSampleConnectionString,
  getDialectName,
  SUPPORTED_DIALECTS,
} from 'src/common/adapters/DataScriptFactory';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';
import { useGetBookmarkItems } from 'src/frontend/hooks/useFolderItems';
import { SqluiCore } from 'typings';

type ConnectionHintProps = {
  showBookmarks?: boolean;
  onChange: (dialect: string, connection: string) => void;
};

export default function ConnectionHint(props: ConnectionHintProps): JSX.Element | null {
  const { data, isLoading } = useGetBookmarkItems();
  let bookmarkedConnectionsDom: any[] = [];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Skeleton variant='rectangular' height={40} />
        <Skeleton variant='rectangular' height={40} />
        <Skeleton variant='rectangular' height={40} />
        <Skeleton variant='rectangular' height={40} />
        <Skeleton variant='rectangular' height={40} />
      </Box>
    );
  }

  const connectionsFromBookmark = data?.filter((bookmark) => bookmark.type === 'Connection');

  if (
    props.showBookmarks === true &&
    connectionsFromBookmark &&
    connectionsFromBookmark.length > 0
  ) {
    // pulling the connection string from bookmarks
    bookmarkedConnectionsDom = connectionsFromBookmark.map((connection) => {
      const bookmark = connection.data as SqluiCore.ConnectionProps;
      const dialect = bookmark.dialect || '';
      const connectionToUse = bookmark.connection;

      const onApplyThisConnectionHint = () => props.onChange(dialect, connectionToUse);

      return (
        <ListItem key={bookmark.id}>
          <ListItemAvatar>
            <Avatar>
              <ConnectionTypeIcon dialect={dialect} status={dialect ? 'online' : ''} />
            </Avatar>
          </ListItemAvatar>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                <StarIcon fontSize='small' />
                <Link
                  underline='hover'
                  onClick={onApplyThisConnectionHint}
                  sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {connection.name}
                </Link>
              </Box>
            }
            secondary={connectionToUse}
          />
        </ListItem>
      );
    });

    // add the divider in front
    bookmarkedConnectionsDom.unshift(<Divider key='divider' />);
  }

  return (
    <List sx={{ bgcolor: 'background.paper', overflow: 'hidden', wordBreak: 'break-all' }}>
      {SUPPORTED_DIALECTS.map((dialect) => {
        const onApplyThisConnectionHint = () =>
          props.onChange(dialect, getSampleConnectionString(dialect));

        return (
          <ListItem key={dialect}>
            <ListItemAvatar>
              <Avatar>
                <ConnectionTypeIcon dialect={dialect} status='online' />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Link
                  underline='hover'
                  onClick={onApplyThisConnectionHint}
                  sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {getDialectName(dialect)}
                </Link>
              }
              secondary={getSampleConnectionString(dialect)}
            />
          </ListItem>
        );
      })}
      {bookmarkedConnectionsDom}
    </List>
  );
}
