import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
export type ModalInput = {
  title: string;
  /**
   * body of the modal
   * @type {[type]}
   */
  message: React.ReactNode;
  showCloseButton?: boolean;
};

type ModalProps = ModalInput & {
  open: boolean;
  onDismiss: () => void;
};

export default function Modal(props: ModalProps) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onDismiss}
      aria-labelledby='modal-dialog-title'
      aria-describedby='modal-dialog-description'>
      <DialogTitle id='modal-dialog-title'>
        {props.title}
        {props.showCloseButton && (
          <IconButton
            aria-label='close'
            onClick={() => props.onDismiss()}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}>
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>{props.message}</DialogContent>
    </Dialog>
  );
}