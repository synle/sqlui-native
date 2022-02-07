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
import { useGetConnectionById, useUpsertConnection } from 'src/hooks';
import TestConnectionButton from 'src/components/TestConnectionButton';
import Toast from 'src/components/Toast';
import { SqluiCore } from 'typings';

type ConnectionHintProps = {
  onChange: (connectionName: string) => void;
};

export default  function ConnectionHint(props: ConnectionHintProps) {
  return (
    <>
      <Alert
        severity='info'
        icon={<ConnectionTypeIcon scheme='mysql' status='online' />}
        sx={{ mb: 2 }}>
        <AlertTitle>MySQL</AlertTitle>
        <Tooltip title='Use this sample MySQL connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('mysql://root:password@localhost:3306')}>
            mysql://root:password@localhost:3306
          </Link>
        </Tooltip>
      </Alert>
      <Alert
        severity='info'
        icon={<ConnectionTypeIcon scheme='mariadb' status='online' />}
        sx={{ mb: 2 }}>
        <AlertTitle>MariaDB</AlertTitle>
        <Tooltip title='Use this sample MariaDB connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('mariadb://root:password@localhost:3306')}>
            mariadb://root:password@localhost:3306
          </Link>
        </Tooltip>
      </Alert>
      <Alert
        severity='info'
        icon={<ConnectionTypeIcon scheme='mssql' status='online' />}
        sx={{ mb: 2 }}>
        <AlertTitle>Microsoft SQL Server</AlertTitle>
        <Tooltip title='Use this sample Microsoft SQL Server connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('mssql://sa:password123!@localhost:1433')}>
            mssql://sa:password123!@localhost:1433
          </Link>
        </Tooltip>
      </Alert>
      <Alert
        severity='info'
        icon={<ConnectionTypeIcon scheme='postgres' status='online' />}
        sx={{ mb: 2 }}>
        <AlertTitle>PostgresSQL</AlertTitle>
        <Tooltip title='Use this sample PostgresSQL connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('postgres://postgres:password@localhost:5432')}>
            postgres://postgres:password@localhost:5432
          </Link>
        </Tooltip>
      </Alert>
      <Alert
        severity='info'
        icon={<ConnectionTypeIcon scheme='sqlite' status='online' />}
        sx={{ mb: 2 }}>
        <AlertTitle>SQLite</AlertTitle>
        <Tooltip title='Use this sample SQLite connection.'>
          <Link underline='hover' onClick={() => props.onChange('sqlite://test-db.sqlite')}>
            sqlite://test-db.sqlite
          </Link>
        </Tooltip>
      </Alert>
      <Alert
        severity='info'
        icon={<ConnectionTypeIcon scheme='cassandra' status='online' />}
        sx={{ mb: 2 }}>
        <AlertTitle>Cassandra</AlertTitle>
        <Tooltip title='Use this sample Cassandra connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('cassandra://username:password@localhost:9042')}>
            cassandra://username:password@localhost:9042
          </Link>
        </Tooltip>
      </Alert>
    </>
  );
}
