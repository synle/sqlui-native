import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

export type ChoiceOption = {
  startIcon?: React.ReactNode;
  label: string | React.ReactNode;
  value: string;
};

export type ChoiceInput = {
  title: string;
  message: string | React.ReactNode;
  options: ChoiceOption[];
};

type ChoiceDialogProps = {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  options: ChoiceOption[];
  onSelect: (newValue: string) => void;
  onDismiss: () => void;
};

export default function ChoiceDialog(props: ChoiceDialogProps) {
  const {
    title,
    message,
    options,
    open,
    onDismiss: handleClose,
    onSelect: handleListItemClick,
  } = props;

  return (
    <Dialog onClose={handleClose} open={open}>
      <div style={{ width: '400px' }}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {message}
          <List sx={{ pt: 0 }}>
            {options.map((option) => (
              <ListItem
                button
                onClick={() => handleListItemClick(option.value)}
                key={option.value}
                sx={{ alignItems: 'center', display: 'flex' }}>
                {!option.startIcon ? null : option.startIcon}
                <ListItemText primary={option.label} sx={{ ml: 1 }} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </div>
    </Dialog>
  );
}
