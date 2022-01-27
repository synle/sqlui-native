import React from 'react';
import Typography from '@mui/material/Typography';
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
    e.preventDefault();
    e.stopPropagation();

    confirm('Delete this connection?') && (await mutateAsync(connectionId));
  };

  return (
    <IconButton aria-label='Delete Connection' onClick={onDelete}>
      <DeleteIcon />
    </IconButton>
  );
}
