import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import CodeEditorBox from 'src/components/CodeEditorBox';

export type PromptActionDialogInput = {
  title?: string;
  message: string;
  value?: string;
  isLongPrompt?: boolean;
  saveLabel?: string;
  required?: boolean;
};

type PromptDialogProps = PromptActionDialogInput & {
  open: boolean;
  onSaveClick: (newValue: string) => void;
  onDismiss: () => void;
};

export default function PromptDialog(props: PromptDialogProps) {
  const [value, setValue] = useState(props.value || '');

  const handleClose = (forceClose = false) => {
    if (props.required && !forceClose) {
      // needs to fill out an input
      // we don't want to allow user to click outside
      return;
    }
    props.onDismiss();
  };

  const onSave = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (props.required && !value) {
      // needs to fill out an input
      // we don't want to allow user to click outside
      return;
    }
    props.onSaveClick(value.trim());
  };

  return (
    <Dialog
      onClose={() => handleClose(false)}
      aria-labelledby='prompt-dialog-title'
      open={props.open}>
      <form onSubmit={onSave} style={{ width: 600 }}>
        <DialogTitle id='prompt-dialog-title'>
          {props.title || 'Prompt'}
          <IconButton
            aria-label='close'
            onClick={() => handleClose(true)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {props.isLongPrompt ? (
            <CodeEditorBox
              value={value}
              onChange={setValue}
              language='json'
              autoFocus={true}
              required={props.required}
              mode='textarea'
            />
          ) : (
            <TextField
              label={props.message}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              required={props.required}
              size='small'
              fullWidth
              autoFocus
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button type='submit'>{props.saveLabel || 'Save Changes'}</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
