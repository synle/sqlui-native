import Typography from '@mui/material/Typography';
import { NewConnectionForm } from 'src/components/ConnectionForm';

export default function NewConnectionPage() {
  return (
    <div className='ConnectionPage'>
      <Typography variant='h4' gutterBottom={true}>New Connection</Typography>
      <NewConnectionForm />
    </div>
  );
}
