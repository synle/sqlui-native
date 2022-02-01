import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export type ModalInput = {
  title: string;
  /**
   * body of the modal
   * @type {[type]}
   */
  message: React.ReactNode;
};

interface ModalProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  onDismiss: () => void;
}

export default function Modal(props: ModalProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onDismiss}
      aria-labelledby='modal-dialog-title'
      aria-describedby='modal-dialog-description'>
      <DialogTitle id='modal-dialog-title'>{props.title}</DialogTitle>
      <DialogContent>{props.body}</DialogContent>
    </Dialog>
  );
}
