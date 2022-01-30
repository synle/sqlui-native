import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
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
  const { prompt, alert } = useActionDialogs();
  const { mutateAsync: importConnection } = useImportConnection();
  const { queries, isLoading: loadingQueries, onImportQuery } = useConnectionQueries();
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { command, dismissCommand } = useCommands();
  const navigate = useNavigate();

  const isLoading = loadingQueries || loadingConnections;

  const onImport = async () => {
    try {
      const rawJson = await prompt({
        title: 'Import Connections / Queries',
        message: 'Import',
        saveLabel: 'Import',
        defaultValue: '',
        isLongPrompt: true,
      });

      let jsonRows: any[];
      try {
        jsonRows = JSON.parse(rawJson || '');
      } catch (err) {
        return alert(`Import failed. Invalid JSON config`);
      }

      // here we will attempt to import all the connections first before queries
      jsonRows = jsonRows.sort((a, b) => {
        return a._type.localeCompare(b._type); //note that query will go after connection (q > c)
      });

      /// check for duplicate id
      const hasDuplicateIds =
        new Set([...jsonRows.map((jsonRow) => jsonRow.id)]).size !== jsonRows.length;
      if (hasDuplicateIds) {
        return alert(`Import failed. JSON Config includes duplicate IDs.`);
      }

      for (const jsonRow of jsonRows) {
        try {
          const { _type, ...rawImportMetaData } = jsonRow;
          switch (_type) {
            case 'connection':
              await importConnection(rawImportMetaData);
              break;
            case 'query':
              await onImportQuery(jsonRow);
              break;
          }
        } catch (err) {
          console.log('>> Import Failed', jsonRow, err);
        }
      }
    } catch (err) {
      //@ts-ignore
    }
  };

  const onExportAll = async () => {
    let jsonContent: any[] = [];

    // TODO: implement export all
    if (connections) {
      for (const connection of connections) {
        jsonContent.push(getExportedConnection(connection));
      }
    }

    if (queries) {
      for (const query of queries) {
        jsonContent.push(getExportedQuery(query));
      }
    }

    downloadText(
      `${new Date().toLocaleString()}.sqlui_native.json`,
      JSON.stringify(jsonContent, null, 2),
      'text/json',
    );
  };

  const onNewConnection = useCallback(() => navigate('/connection/new'), []);

  useEffect(() => {
    if (command) {
      dismissCommand();

      switch (command.event) {
        case 'clientEvent.import':
          onImport();
          break;
        case 'clientEvent.exportAll':
          onExportAll();
          break;
        case 'clientEvent.newConnection':
          onNewConnection();
          break;
      }
    }
  }, [command]);

  if (isLoading) {
    return null;
  }

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
    <div style={{ textAlign: 'center', marginBottom: '15px' }}>
      <SplitButton
        id='new-connection-split-button'
        label='Connection'
        startIcon={<AddIcon />}
        onClick={onNewConnection}
        options={options}
      />
    </div>
  );
}
