import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

type AlertDialogProps = {
  open: boolean;
  title: string;
  message: string;
  yesLabel?: string;
  onYesClick?: () => void;
  noLabel?: string;
  onDismiss: () => void;
  isConfirm?: boolean;
};

export default function AlertDialog(props: AlertDialogProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onDismiss}
      aria-labelledby='alert-dialog-title'
      aria-describedby='alert-dialog-description'>
      <div style={{ width: 400 }}>
        <DialogTitle id='alert-dialog-title'>{props.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id='alert-dialog-description'>{props.message}</DialogContentText>
        </DialogContent>
        <DialogActions>
          {props.isConfirm ? (
            <>
              <Button onClick={props.onDismiss}>{props.noLabel || 'No'}</Button>
              <Button onClick={props.onYesClick} autoFocus variant='contained'>
                {props.yesLabel || 'Yes'}
              </Button>{' '}
            </>
          ) : (
            <>
              <Button onClick={props.onDismiss} autoFocus variant='contained'>
                {props.yesLabel || 'OK'}
              </Button>
            </>
          )}
        </DialogActions>
      </div>
    </Dialog>
  );
}
