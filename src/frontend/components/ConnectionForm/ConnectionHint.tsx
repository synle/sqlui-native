import { Link } from '@mui/material';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import {
  getSampleConnectionString,
  SUPPORTED_DIALECTS,
} from 'src/common/adapters/DataScriptFactory';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';

type ConnectionHintProps = {
  onChange: (dialect: string, connection: string) => void;
};

export default function ConnectionHint(props: ConnectionHintProps) {
  return (
    <List sx={{ bgcolor: 'background.paper' }}>
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
                  {dialect}
                </Link>
              }
              secondary={getSampleConnectionString(dialect)}
            />
          </ListItem>
        );
      })}
    </List>
  );
}
