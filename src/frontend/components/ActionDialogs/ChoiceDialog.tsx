import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";

/** Represents a single selectable option in a choice dialog. */
export type ChoiceOption = {
  startIcon?: React.ReactNode;
  label: string | React.ReactNode;
  value: string;
  disabled?: boolean;
};

/** Input configuration for creating a choice dialog with a list of options. */
export type ChoiceInput = {
  title: string;
  message: string | React.ReactNode;
  options: ChoiceOption[];
  required?: boolean;
  isFullScreen?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
};

/** Internal props for the ChoiceDialog component, combining ChoiceInput with open/select/dismiss state. */
type ChoiceDialogProps = ChoiceInput & {
  open: boolean;
  onSelect: (newValue: string) => void;
  onDismiss: () => void;
};

/**
 * Dialog component that presents a list of selectable options to the user.
 * @param props - Choice dialog configuration including title, message, options, and selection callback.
 * @returns The rendered choice dialog element.
 */
export default function ChoiceDialog(props: ChoiceDialogProps): JSX.Element | null {
  const { title, message, options, open, required, onDismiss: handleClose, onSelect: handleListItemClick } = props;

  let onClose: (() => void) | undefined = handleClose;
  if (required) {
    onClose = undefined;
  }

  return (
    <Dialog
      onClose={onClose}
      open={open}
      fullScreen={!!props.isFullScreen}
      fullWidth={!props.isFullScreen}
      maxWidth={props.isFullScreen ? false : props.size || "md"}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message}
        <List dense>
          {options.map((option) => (
            <ListItem
              button
              onClick={() => !option.disabled && handleListItemClick(option.value)}
              disabled={!!option.disabled}
              key={option.value}
              sx={{ alignItems: "center", display: "flex", gap: 1 }}
            >
              {!option.startIcon ? null : option.startIcon}
              <ListItemText primary={option.label} />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
