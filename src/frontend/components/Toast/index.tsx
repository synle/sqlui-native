import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slide from '@mui/material/Slide';
import Snackbar from '@mui/material/Snackbar';
import React from 'react';

type ToastProps = {
  open: boolean;
  onClose: () => void;
  message: string | React.ReactElement;
  autoHideDuration?: number;
  anchorOrigin?: AnchorOrigin;
};

export type AnchorOrigin = {
  vertical?: 'bottom' | 'top';
  horizontal?: 'left' | 'right' | 'center';
};

export default function Toast(props: ToastProps) {
  const { message, open, onClose, autoHideDuration } = props;

  const action = (
    <>
      <IconButton size='small' aria-label='close' color='inherit' onClick={onClose}>
        <CloseIcon fontSize='small' />
      </IconButton>
    </>
  );

  const anchorOrigin = props?.anchorOrigin;

  const vertical = anchorOrigin?.vertical || 'bottom';
  const horizontal = anchorOrigin?.horizontal || 'center';

  const messageDom = (
    <Box sx={{ display: 'flex', alignItems: 'center', width: '350px' }}>{message}</Box>
  );

  return (
    <Snackbar
      open={open}
      anchorOrigin={{
        vertical,
        horizontal,
      }}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      message={messageDom}
      action={action}
      TransitionComponent={Slide}
    />
  );
}
