import { useNavigate } from 'react-router-dom';
import { Button } from '@mui/material';

export default function NewConnectionButton() {
  const navigate = useNavigate();

  return (
    <Button onClick={() => navigate('/connection/new')} variant='contained' fullWidth={true}>
      New Connection
    </Button>
  );
}
