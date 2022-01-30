import * as React from 'react';
import Button from '@mui/material/Button';
import Avatar from '@mui/material/Avatar';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import Typography from '@mui/material/Typography';
import { blue } from '@mui/material/colors';
import DialogContent from '@mui/material/DialogContent';

export type ChoiceActionDialogOption = {
  startIcon?: React.ReactNode;
  label: string;
  value: string;
};

interface ChoiceDialogProps {
  open: boolean;
  title: string;
  message: string | React.ReactNode;
  options: ChoiceActionDialogOption[];
  onSelect: (newValue: string) => void;
  onDismiss: () => void;
}

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
