import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SplitButton from 'src/components/SplitButton';
import { useActionDialogs } from 'src/components/ActionDialogs';

export default function NewConnectionButton() {
  const { prompt } = useActionDialogs();

  const navigate = useNavigate();

  const options = [
    {
      label: 'Import',
      onClick: async () => {
        const rawJson = await prompt('Import', '', true);
        const jsonRows: any = JSON.parse(rawJson || '');
        for (const jsonRow of jsonRows) {
          const { _type, ...rawImportMetaData } = jsonRow;
          switch (_type) {
            case 'connection':
            case 'query':
            default:
              console.log(rawImportMetaData);
              break;
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
