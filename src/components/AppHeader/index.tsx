import {useState} from 'react';
import {useEffect} from 'react';
import {useNavigate} from 'react-router-dom';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import SettingsIcon from '@mui/icons-material/Settings';
import KeyboardCommandKeyIcon from '@mui/icons-material/KeyboardCommandKey';
import PhotoSizeSelectSmallIcon from '@mui/icons-material/PhotoSizeSelectSmall';
import {useGetSessions} from 'src/hooks';
import {useGetCurrentSession} from 'src/hooks';
import DropdownButton from 'src/components/DropdownButton';
import {useCommands} from 'src/components/MissionControl';
import appPackage from 'src/package.json';

export default function AppHeader() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { selectCommand } = useCommands();

  const options = [
    {
      label: currentSession?.name || '',
    },
    {
      label: 'divider',
    },
    {
      label: 'New Session',
      onClick: () => selectCommand({ event: 'clientEvent/session/new' }),
      startIcon: <AddIcon />,
    },
    {
      label: 'Change Session',
      onClick: () => selectCommand({ event: 'clientEvent/session/switch' }),
      startIcon: <PhotoSizeSelectSmallIcon />,
    },
    {
      label: 'Rename Session',
      onClick: () => selectCommand({ event: 'clientEvent/session/rename' }),
      startIcon: <EditIcon />,
    },
    {
      label: 'Command Palette',
      onClick: () => selectCommand({ event: 'clientEvent/showCommandPalette' }),
      startIcon: <KeyboardCommandKeyIcon />,
    },
    {
      label: 'divider',
    },
    {
      label: 'Settings',
      onClick: () => selectCommand({ event: 'clientEvent/showSettings' }),
      startIcon: <SettingsIcon />,
    },
  ];

  useEffect(() => {
    let newTitle;
    if (currentSession?.name) {
      newTitle = `${currentSession?.name}`;
    } else {
      newTitle = `SQLUI Native`;
    }
    window.document.title = newTitle;
  }, [currentSession?.name]);

  return (
    <AppBar position='static'>
      <Toolbar variant='dense'>
        <Typography
          variant='h5'
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer', fontWeight: 'bold', mr: 3 }}>
          SQLUI NATIVE {appPackage.version}
        </Typography>

        <Tooltip title='This is the current session name. Click to rename it.'>
          <Typography
            variant='subtitle1'
            sx={{ cursor: 'pointer', mr: 'auto', fontFamily: 'monospace' }}
            onClick={() => selectCommand({ event: 'clientEvent/session/rename' })}>
            ({currentSession?.name})
          </Typography>
        </Tooltip>

        <DropdownButton
          id='session-action-split-button'
          options={options}
          onToggle={(newOpen) => setOpen(newOpen)}
          isLoading={isLoading}>
          <IconButton aria-label='Table Actions' color='inherit'>
            <MenuIcon fontSize='inherit' color='inherit' />
          </IconButton>
        </DropdownButton>
      </Toolbar>
    </AppBar>
  );
}