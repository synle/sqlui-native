import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import EditConnectionPage from 'src/views/EditConnectionPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import MainPage from 'src/views/MainPage';
import ActionDialogs from 'src/components/ActionDialogs';

export default function AppHeader() {
  const navigate = useNavigate();

  return (
    <AppBar position='static'>
      <Toolbar variant='dense'>
        <Typography variant='h4' onClick={() => navigate('/')}>
          SQLUI NATIVE
        </Typography>
      </Toolbar>
    </AppBar>
  );
}
