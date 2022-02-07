import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from 'react-query';
import { format } from 'sql-formatter';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { Button } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PreviewIcon from '@mui/icons-material/Preview';
import FormatColorTextIcon from '@mui/icons-material/FormatColorText';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import {
  useGetConnections,
  useExecute,
  useConnectionQueries,
  useConnectionQuery,
  useShowHide,
  useGetDatabases,
  refreshAfterExecution,
} from 'src/hooks';
import { useCommands } from 'src/components/MissionControl';
import CodeEditorBox from 'src/components/CodeEditorBox';
import ResultBox from 'src/components/ResultBox';
import Select from 'src/components/Select';
import { SqluiCore, SqluiFrontend } from 'typings';

interface ConnectionRevealButtonProps {
  query: SqluiFrontend.ConnectionQuery;
}

export default function ConnectionRevealButton(props: ConnectionRevealButtonProps) {
  const { query } = props;
  const { selectCommand } = useCommands();

  if (!query) {
    return null;
  }

  const disabled = !query.connectionId && !query.databaseId;

  return (
    <Tooltip title='Reveal this Connection on the connection tree.'>
      <span>
        <Button
          type='button'
          variant='outlined'
          startIcon={<PreviewIcon />}
          onClick={() => selectCommand({ event: 'clientEvent/query/reveal' })}
          sx={{ ml: 3 }}
          disabled={disabled}>
          Reveal
        </Button>
      </span>
    </Tooltip>
  );
}
