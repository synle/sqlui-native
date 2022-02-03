import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend } from 'typings';
import AlertDialog from 'src/components/ActionDialogs/AlertDialog';
import PromptDialog, { PromptInput } from 'src/components/ActionDialogs/PromptDialog';
import ChoiceDialog, { ChoiceInput, ChoiceOption } from 'src/components/ActionDialogs/ChoiceDialog';
import ModalDialog, { ModalInput } from 'src/components/ActionDialogs/ModalDialog';

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

// TODO: move me to a file
// used for show and hide the sidebar trees
type AlertActionDialog = {
  type: 'alert';
  message: string;
  onSubmit?: () => void;
};

type ConfirmActionDialog = {
  type: 'confirm';
  message: string;
  onSubmit: (yesSelected: boolean) => void;
};

type ChoiceActionDialog = ChoiceInput & {
  type: 'choice';
  onSubmit: (yesSelected: boolean, selectedChoice?: string) => void;
};

type PromptActionDialog = PromptInput & {
  type: 'prompt';
  onSubmit: (yesSelected: boolean, newValue?: string) => void;
};

type ModalActionDialog = ModalInput & {
  type: 'modal';
  onSubmit: (closed: boolean) => void;
};

type ActionDialog =
  | AlertActionDialog
  | ConfirmActionDialog
  | PromptActionDialog
  | ChoiceActionDialog
  | ModalActionDialog;

const QUERY_KEY_ACTION_DIALOGS = 'actionDialogs';
let _actionDialogs: ActionDialog[] = [];

export function useActionDialogs() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery(QUERY_KEY_ACTION_DIALOGS, () => _actionDialogs);

  const prompt = (props: PromptInput): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
      const { message, value, isLongPrompt } = props;

      const newActionDialog: ActionDialog = {
        ...props,
        type: 'prompt',
        onSubmit: (yesSelected, newValue) => {
          yesSelected ? resolve(newValue) : reject();
        },
      };
      _actionDialogs.push(newActionDialog);
      queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
    });
  };

  const confirm = (message: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'confirm',
        message,
        onSubmit: (yesSelected) => {
          yesSelected ? resolve() : reject();
        },
      };
      _actionDialogs.push(newActionDialog);
      queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
    });
  };

  const choice = (
    title: string,
    message: string | React.ReactNode,
    options: ChoiceOption[],
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'choice',
        title,
        message,
        options,
        onSubmit: (yesSelected, newValue) => {
          yesSelected && newValue ? resolve(newValue) : reject();
        },
      };
      _actionDialogs.push(newActionDialog);
      queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
    });
  };

  const alert = (message: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'alert',
        message,
      };
      _actionDialogs.push(newActionDialog);
      queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
    });
  };

  const modal = (props: ModalInput): Promise<void> => {
    return new Promise((resolve, reject) => {
      _actionDialogs.push({
        type: 'modal',
        onSubmit: () => {},
        ...props,
      });
      queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
    });
  };

  let dialog;
  try {
    if (data) {
      dialog = data[data.length - 1];
    }
  } catch (err) {
    dialog = undefined;
  }

  const dismiss = () => {
    _actionDialogs.pop();
    queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
  };

  return {
    dialogs: data,
    dialog,
    alert,
    prompt,
    confirm,
    choice,
    dismiss,
    modal,
  };
}
