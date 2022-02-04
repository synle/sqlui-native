import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Box from '@mui/material/Box';
import SplitButton from 'src/components/SplitButton';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { downloadText } from 'src/data/file';
import { useCommands } from 'src/components/MissionControl';
import {
  useImportConnection,
  useConnectionQueries,
  useGetConnections,
  getExportedConnection,
  getExportedQuery,
} from 'src/hooks';

export default function NewConnectionButton() {
  const { selectCommand } = useCommands();

  const onImport = () => selectCommand({ event: 'clientEvent/import' });
  const onExportAll = () => selectCommand({ event: 'clientEvent/exportAll' });
  const onNewConnection = () => selectCommand({ event: 'clientEvent/connection/new' });

  const options = [
    {
      label: 'Import',
      onClick: onImport,
      startIcon: <ArrowDownwardIcon />,
    },
    {
      label: 'Export All',
      onClick: onExportAll,
      startIcon: <ArrowUpwardIcon />,
    },
  ];

  return (
    <Box sx={{ textAlign: 'center', marginBottom: 2, marginTop: 1}}>
      <SplitButton
        id='new-connection-split-button'
        label='Connection'
        startIcon={<AddIcon />}
        onClick={onNewConnection}
        options={options}
      />
    </Box>
  );
}
