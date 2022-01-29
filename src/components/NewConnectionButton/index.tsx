import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SplitButton from 'src/components/SplitButton';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { downloadText } from 'src/data/file';
import {
  useImportConnection,
  useConnectionQueries,
  useGetMetaData,
  getExportedConnection,
  getExportedQuery,
} from 'src/hooks';

export default function NewConnectionButton() {
  const { prompt } = useActionDialogs();
  const { mutateAsync: importConnection } = useImportConnection();
  const { queries, isLoading: loadingQueries, onImportQuery } = useConnectionQueries();
  const { data: connections, isLoading: loadingConnections } = useGetMetaData();
  const navigate = useNavigate();

  const isLoading = loadingQueries || loadingConnections;

  if (isLoading) {
    return null;
  }

  const options = [
    {
      label: 'Import',
      onClick: async () => {
        const rawJson = await prompt('Import', '', true);
        const jsonRows: any = JSON.parse(rawJson || '');
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
      },
    },
    {
      label: 'Export All',
      onClick: async () => {
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
      },
    },
  ];

  return (
    <div style={{ textAlign: 'center' }}>
      <SplitButton
        id='new-connection-split-button'
        label='New Connection'
        onClick={() => navigate('/connection/new')}
        options={options}
      />
    </div>
  );
}
