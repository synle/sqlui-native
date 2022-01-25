import DeleteIcon from '@mui/icons-material/Delete';
import { useDeleteConnection } from 'src/hooks';

interface DeleteConnectionButtonProps {
  connectionId: string;
}

export default function DeleteConnectionButton(props: DeleteConnectionButtonProps) {
  const { connectionId } = props;
  const { mutateAsync } = useDeleteConnection();
  const onDelete = async () => {
    confirm('Delete this connection?') && (await mutateAsync(connectionId));
  };

  return (
    <div>
      <a onClick={onDelete}>
        <DeleteIcon />
      </a>
    </div>
  );
}
