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
      <b onClick={onDelete}>Delete</b>
    </div>
  );
}
