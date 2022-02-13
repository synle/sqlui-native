import DeleteIcon from '@mui/icons-material/Delete';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import React from 'react';
import { useActionDialogs } from 'src/hooks/useActionDialogs';
import { useDeleteConnection } from 'src/hooks/useConnection';

type DeleteConnectionButtonProps = {
  connectionId: string;
};

export default function DeleteConnectionButton(props: DeleteConnectionButtonProps) {
  const { connectionId } = props;
  const { confirm } = useActionDialogs();
  const { mutateAsync } = useDeleteConnection();
  const onDelete = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await confirm('Delete this connection?');
      await mutateAsync(connectionId);
    } catch (err) {}
  };

  return (
    <Tooltip title='Delete Connection'>
      <IconButton aria-label='Delete Connection' onClick={onDelete} size='small'>
        <DeleteIcon fontSize='inherit' />
      </IconButton>
    </Tooltip>
  );
}
