import React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import { useDeleteConnection } from 'src/hooks';

interface DeleteConnectionButtonProps {
  connectionId: string;
}

export default function DeleteConnectionButton(props: DeleteConnectionButtonProps) {
  const { connectionId } = props;
  const { mutateAsync } = useDeleteConnection();
  const onDelete = async (e: React.SyntheticEvent) => {
    confirm('Delete this connection?') && (await mutateAsync(connectionId));
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div>
      <a onClick={onDelete}>
        <DeleteIcon />
      </a>
    </div>
  );
}
