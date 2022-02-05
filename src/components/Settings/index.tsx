import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Tooltip from '@mui/material/Tooltip';
import Link from '@mui/material/Link';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import SaveIcon from '@mui/icons-material/Save';
import ConnectionTypeIcon from 'src/components/ConnectionTypeIcon';
import { useSettings } from 'src/hooks';
import TestConnectionButton from 'src/components/TestConnectionButton';
import Toast from 'src/components/Toast';
import { SqluiCore, SqluiFrontend } from 'typings';
import { useCommands, Command } from 'src/components/MissionControl';
import Select from 'src/components/Select';

interface SettingsProps {}

export default function Settings(props: SettingsProps) {
  const { isLoading, settings, onChange } = useSettings();

  const onSettingChange = (key: SqluiFrontend.SettingKey, value: any) => {
    if (!settings) {
      return;
    }

    //@ts-ignore
    settings[key] = value;

    onChange(settings);
  };

  let contentDom: React.ReactNode;

  if (isLoading) {
    contentDom = <>Loading...</>;
  } else if (!settings) {
    contentDom = null;
  } else {
    contentDom = (
      <>
        <Typography variant='subtitle1' gutterBottom={true}>
          Theme Mode
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.darkMode}
            onChange={(newValue) => onSettingChange('darkMode', newValue)}
            sx={{ width: '100%' }}>
            <option value=''>Follows System Settings</option>
            <option value='dark'>Prefers Dark Mode</option>
            <option value='light'>Prefers Light Mode</option>
          </Select>
        </div>
        <Typography variant='subtitle1' gutterBottom={true} sx={{ mt: 2 }}>
          Editor Mode
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.editorMode || 'advanced'}
            onChange={(newValue) => onSettingChange('editorMode', newValue)}
            sx={{ width: '100%' }}>
            <option value='advanced'>Advanced Mode</option>
            <option value='simple'>Simple Mode</option>
          </Select>
        </div>
        <Typography variant='subtitle1' gutterBottom={true} sx={{ mt: 2 }}>
          Word Wrap
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.wordWrap}
            onChange={(newValue) => onSettingChange('wordWrap', newValue)}
            sx={{ width: '100%' }}>
            <option value=''>No wrap</option>
            <option value='wrap'>Wrap</option>
          </Select>
        </div>
        <Typography variant='subtitle1' gutterBottom={true} sx={{ mt: 2 }}>
          Query Tab Orientation
        </Typography>
        <div className='FormInput__Row'>
          <Select
            value={settings.queryTabOrientation}
            onChange={(newValue) => onSettingChange('queryTabOrientation', newValue)}
            sx={{ width: '100%' }}>
            <option value=''>Application will find which orientation best fit</option>
            <option value='horizontal'>Horizontal</option>
            <option value='vertical'>Vertical</option>
          </Select>
        </div>

      </>
    );
  }

  return <div style={{ width: '400px' }}>{contentDom}</div>;
}
