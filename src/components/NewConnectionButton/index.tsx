import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

export default function NewConnectionButton() {
  const navigate = useNavigate();

  return (
    <Button onClick={() => navigate('/connection/new')} startIcon={<AddIcon />}>
      New Connection
    </Button>
  );
}
