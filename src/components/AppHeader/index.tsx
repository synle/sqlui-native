import {useState} from 'react';
import { useNavigate } from 'react-router-dom';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Tooltip from '@mui/material/Tooltip';
import EditConnectionPage from 'src/views/EditConnectionPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import MainPage from 'src/views/MainPage';
import ActionDialogs from 'src/components/ActionDialogs';

export default function AppHeader() {
  const [isSessionManagementOpen, setIsSessionManagementOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <AppBar position='static'>
      <Toolbar variant='dense'>
        <Typography variant='h5' onClick={() => navigate('/')} sx={{cursor: 'pointer', fontWeight: 'bold'}}>
          SQLUI NATIVE
        </Typography>

        <Tooltip title='Session Management'>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ ml: 'auto' }}
            onClick={() => setIsSessionManagementOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
