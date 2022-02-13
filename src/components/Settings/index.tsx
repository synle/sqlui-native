import HelpIcon from '@mui/icons-material/Help';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import React from 'react';
import Select from 'src/components/Select';
import { useQuerySizeSetting } from 'src/hooks/useSettings';
import { useSettings } from 'src/hooks/useSettings';
import { SqluiFrontend } from 'typings';

type SettingsProps = {};

export default function Settings(props: SettingsProps) {
  const { isLoading, settings, onChange } = useSettings();
  const querySize = useQuerySizeSetting();

  const onSettingChange = (key: SqluiFrontend.SettingKey, value: any) => {
    if (!settings) {
      return;
    }

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
        <Typography className='FormInput__Label' variant='subtitle1'>
          Theme Mode
          <Tooltip title='Application theme mode. Dark mode or light mode or follows system preference'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
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
        <Typography className='FormInput__Label' variant='subtitle1'>
          Editor Mode
          <Tooltip title='Which editor to use? Simple Editor vs Advanced Editor'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
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
        <Typography className='FormInput__Label' variant='subtitle1'>
          Editor Word Wrap
          <Tooltip title='Whether or not to wrap words inside of the editor by default'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
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
        <Typography className='FormInput__Label' variant='subtitle1'>
          Query Tab Orientation
          <Tooltip title='Query Tabs Orientation. Vertical tabs vs Horizontal tabs'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
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
        <Typography className='FormInput__Label' variant='subtitle1'>
          Query Size
          <Tooltip title='The default query size for Select SQL statements. Note this change only apply to future queries.'>
            <HelpIcon fontSize='small' sx={{ ml: 1 }} />
          </Tooltip>
        </Typography>
        <div className='FormInput__Row'>
          <TextField
            defaultValue={settings.querySize || querySize}
            onBlur={(e) => onSettingChange('querySize', e.target.value)}
            required
            size='small'
            fullWidth={true}
            type='number'
          />
        </div>
      </>
    );
  }

  return <div style={{ width: '400px' }}>{contentDom}</div>;
}
