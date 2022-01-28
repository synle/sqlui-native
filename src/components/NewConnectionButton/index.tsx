import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SplitButton from 'src/components/SplitButton';
import { useActionDialogs } from 'src/components/ActionDialogs';
import { useImportConnection, useConnectionQueries } from 'src/hooks';

export default function NewConnectionButton() {
  const { prompt } = useActionDialogs();
  const { mutateAsync: importConnection } = useImportConnection();
  const { isLoading, onImportQuery } = useConnectionQueries();
  const navigate = useNavigate();

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
