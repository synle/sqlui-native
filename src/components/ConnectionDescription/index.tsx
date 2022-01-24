import React from 'react';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import InboxIcon from '@mui/icons-material/Inbox';
import DraftsIcon from '@mui/icons-material/Drafts';
import DatabaseDescription from 'src/components/DatabaseDescription';
import { useGetConnections } from 'src/hooks';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <>No Data</>;
  }

  return (
    <Box className='ConnectionDescription' sx={{ bgcolor: 'background.paper' }}>
      <List>
        {connections.map((connection) => (
          <nav key={connection.id}>
            <ListItem>
              <h3>{connection.name}</h3>
              <Link to={`/connection/edit/${connection.id}`}>Edit Connection</Link>
              <DatabaseDescription connectionId={connection.id} />
            </ListItem>
          </nav>
        ))}
      </List>
    </Box>
  );
}
