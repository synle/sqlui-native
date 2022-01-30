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
      <div style={{ width: '4g00px' }}>
        <DialogTitle>{title}</DialogTitle>
        <List sx={{ pt: 0 }}>
          {options.map((option) => (
            <ListItem button onClick={() => handleListItemClick(option.value)} key={option.value}>
              {!option.startIcon ? null : (
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: blue[100], color: blue[600] }}>{option.startIcon}</Avatar>
                </ListItemAvatar>
              )}
              <ListItemText primary={option.value} />
            </ListItem>
          ))}
        </List>
      </div>
    </Dialog>
  );
}
