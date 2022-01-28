import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SplitButton from 'src/components/SplitButton';

export default function NewConnectionButton() {
  const navigate = useNavigate();

  const options = [
    {
      label: 'Import',
      onClick: () => {},
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
