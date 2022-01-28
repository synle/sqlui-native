import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function NewConnectionButton() {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center' }}>
      <Button
        onClick={() => navigate('/connection/new')}
        startIcon={<AddIcon />}
        variant='outlined'>
        Connection
      </Button>
    </div>
  );
}
