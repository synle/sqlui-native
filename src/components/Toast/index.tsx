import { useQuery } from 'react-query';
import { useQueryClient } from 'react-query';
import React from 'react';
import CloseIcon from '@mui/icons-material/Close';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';

interface ToastProps {
  open: boolean;
  onClose: () => void;
  message: string;
}

export default function Toast(props: ToastProps) {
  const { message, open, onClose } = props;

  const action = (
    <>
      <IconButton size='small' aria-label='close' color='inherit' onClick={onClose}>
        <CloseIcon fontSize='small' />
      </IconButton>
    </>
  );
  return (
    <Snackbar
      open={open}
      autoHideDuration={6000}
      onClose={onClose}
      message={message}
      action={action}
    />
  );
}
