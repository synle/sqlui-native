import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

export default function NewConnectionButton() {
  const navigate = useNavigate();

  return (
    <Button onClick={() => navigate('/connection/new')} size='small' fullWidth={true}>
      New Connection
    </Button>
  );
}
