import React from 'react';
import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
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
    <IconButton aria-label='Delete Connection' onClick={onDelete}>
      <DeleteIcon />
    </IconButton>
  );
}
