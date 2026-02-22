import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";

export type AlertInput = {
  title?: string;
  message: string;
  yesLabel?: string;
  onYesClick?: () => void;
  noLabel?: string;
  isConfirm?: boolean;
  isFullScreen?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
};

type AlertDialogProps = AlertInput & {
  open: boolean;
  onDismiss: () => void;
};

export default function AlertDialog(props: AlertDialogProps): JSX.Element | null {
  return (
    <Dialog
      open={props.open}
      onClose={props.onDismiss}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      fullScreen={!!props.isFullScreen}
      fullWidth={!props.isFullScreen}
      maxWidth={props.isFullScreen ? false : props?.size || "sm"}
    >
      <DialogTitle id="alert-dialog-title">{props.title || "Alert"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">{props.message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        {props.isConfirm ? (
          <>
            <Button onClick={props.onDismiss}>{props.noLabel || "No"}</Button>
            <Button onClick={props.onYesClick} autoFocus variant="contained">
              {props.yesLabel || "Yes"}
            </Button>{" "}
          </>
        ) : (
          <>
            <Button onClick={props.onDismiss} autoFocus variant="contained">
              {props.yesLabel || "OK"}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
