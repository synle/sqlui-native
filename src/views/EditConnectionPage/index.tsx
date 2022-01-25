import { useParams } from 'react-router-dom';
import { EditConnectionForm } from 'src/components/ConnectionForm';

export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;

  if (!connectionId) {
    return null;
  }

  return (
    <div>
      EditConnectionPage
      <div>
        <EditConnectionForm id={connectionId} />
      </div>
    </div>
  );
}
