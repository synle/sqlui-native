import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend } from 'typings';
import AlertDialog from 'src/components/ActionDialogs/AlertDialog';
import PromptDialog, { PromptInput } from 'src/components/ActionDialogs/PromptDialog';
import ChoiceDialog, { ChoiceInput, ChoiceOption } from 'src/components/ActionDialogs/ChoiceDialog';
import ModalDialog, { ModalInput } from 'src/components/ActionDialogs/ModalDialog';
import { useActionDialogs } from 'src/hooks/useActionDialogs';

interface ActionDialogsProps {}

export default function ActionDialogs(props: ActionDialogsProps) {
  const { dialog, dismiss } = useActionDialogs();

  if (!dialog) {
    return null;
  }

  const onConfirmSubmit = () => {
    dismiss();
    dialog.onSubmit && dialog.onSubmit(true);
  };
  const onPromptSaveClick = (newValue?: string) => {
    dismiss();
    dialog.onSubmit && dialog.onSubmit(true, newValue);
  };
  const onChoiceSelect = (newValue?: string) => {
    dismiss();
    dialog.onSubmit && dialog.onSubmit(true, newValue);
  };
  const onDimiss = () => {
    dismiss();
    dialog.onSubmit && dialog.onSubmit(false);
  };

  switch (dialog.type) {
    case 'alert':
      return (
        <AlertDialog
          open={true}
          title='Alert'
          message={dialog.message}
          onDismiss={onDimiss}
          isConfirm={false}
        />
      );
    case 'confirm':
      return (
        <AlertDialog
          open={true}
          title='Confirmation'
          message={dialog.message}
          onYesClick={onConfirmSubmit}
          onDismiss={onDimiss}
          isConfirm={true}
        />
      );
    case 'prompt':
      return (
        <PromptDialog
          open={true}
          title={dialog.title}
          message={dialog.message}
          value={dialog.value}
          onSaveClick={onPromptSaveClick}
          onDismiss={onDimiss}
          isLongPrompt={dialog.isLongPrompt}
          saveLabel={dialog.saveLabel}
          required={dialog.required}
        />
      );
    case 'choice':
      return (
        <ChoiceDialog
          open={true}
          title={dialog.title}
          message={dialog.message}
          options={dialog.options}
          onSelect={onChoiceSelect}
          onDismiss={onDimiss}
        />
      );
    case 'modal':
      return (
        <ModalDialog
          open={true}
          title={dialog.title}
          message={dialog.message}
          onDismiss={onDimiss}
          showCloseButton={!!dialog.showCloseButton}
        />
      );
  }
  return null;
}
