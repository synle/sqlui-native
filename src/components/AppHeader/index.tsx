import { useState } from 'react';
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
import { useActionDialogs } from 'src/components/ActionDialogs';

export default function AppHeader() {
  const { choice } = useActionDialogs();
  const navigate = useNavigate();

  const onChangeSession = async () => {
    try {
      const selected = await choice('Choose a session', 'selected session abc..', []);
      alert(selected);
    } catch (err) {
      //@ts-ignore
    }
  };

  return (
    <AppBar position='static'>
      <Toolbar variant='dense'>
        <Typography
          variant='h5'
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', fontWeight: 'bold' }}>
          SQLUI NATIVE
        </Typography>

        <Tooltip title='Session Management'>
          <IconButton
            size='large'
            edge='start'
            color='inherit'
            aria-label='menu'
            sx={{ ml: 'auto' }}
            onClick={onChangeSession}>
            <MenuIcon />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
}
