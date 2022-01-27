import { useParams } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import { EditConnectionForm } from 'src/components/ConnectionForm';

export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;

  if (!connectionId) {
    return null;
  }

  return (
    <div className='ConnectionPage'>
      <Typography variant='h4' gutterBottom={true}>Edit Connection</Typography>
      <EditConnectionForm id={connectionId} />
    </div>
  );
}
