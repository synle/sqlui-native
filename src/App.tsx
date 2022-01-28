import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import './App.scss';
import { HashRouter, Routes, Route, Link } from 'react-router-dom';
import EditConnectionPage from 'src/views/EditConnectionPage';
import NewConnectionPage from 'src/views/NewConnectionPage';
import MainPage from 'src/views/MainPage';
import ActionDialogs from 'src/components/ActionDialogs';
import AppHeader from 'src/components/AppHeader';
import Resizer from 'src/components/Resizer';

export default function App() {
  return (
    <HashRouter>
      <div className='App'>
        <AppHeader />
        <section className='App__Section'>
          <Routes>
            <Route path='/' element={<MainPage />} />
            <Route path='/connection/new' element={<NewConnectionPage />} />
            <Route path='/connection/edit/:connectionId' element={<EditConnectionPage />} />
            <Route path='/*' element={<MainPage />} />
          </Routes>
        </section>
      </div>
      <ActionDialogs />
    </HashRouter>
  );
}
