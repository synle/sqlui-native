import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

interface AlertDialogProps {
  open: boolean;
  title: string;
  message: string;
  yesLabel?: string;
  onYesClick: () => void;
  noLabel?: string;
  onDismiss: () => void;
}

export default function AlertDialog(props: AlertDialogProps) {
  return (
    <div>
      <Dialog
        open={props.open}
        onClose={props.onDismiss}
        aria-labelledby='alert-dialog-title'
        aria-describedby='alert-dialog-description'>
        <DialogTitle id='alert-dialog-title'>{props.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>{props.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onDismiss}>{props.noLabel || 'No'}</Button>
          <Button onClick={props.onYesClick} autoFocus variant='contained'>
            {props.yesLabel || 'Yes'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
