import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { SqluiCore, SqluiFrontend } from 'typings';
import AlertDialog from 'src/components/ActionDialogs/AlertDialog';
import PromptDialog from 'src/components/ActionDialogs/PromptDialog';

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
          title={dialog.title || 'Prompt'}
          message={dialog.message}
          value={dialog.defaultValue}
          onSaveClick={onPromptSaveClick}
          onDismiss={onDimiss}
          isLongPrompt={dialog.isLongPrompt}
          saveLabel={dialog.saveLabel}
        />
      );
  }
  return null;
}

// TODO: move me to a file
// used for show and hide the sidebar trees
type ActionDialog =
  | {
      type: 'alert';
      message: string;
      onSubmit?: () => void;
    }
  | {
      type: 'confirm';
      message: string;
      onSubmit: (yesSelected: boolean) => void;
    }
  | {
      type: 'prompt';
      title?: string;
      message: string;
      defaultValue?: string;
      isLongPrompt?: boolean;
      saveLabel?: string;
      onSubmit: (yesSelected: boolean, newValue?: string) => void;
    };

interface PromptActionDialogInput {
  title?: string;
  message: string;
  defaultValue?: string;
  isLongPrompt?: boolean;
  saveLabel?: string;
}

const QUERY_KEY_ACTION_DIALOGS = 'actionDialogs';
let _actionDialogs: ActionDialog[] = [];

export function useActionDialogs() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery(QUERY_KEY_ACTION_DIALOGS, () => _actionDialogs);

  const prompt = (props: PromptActionDialogInput): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
      const { message, defaultValue, isLongPrompt } = props;

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
    dismiss,
  };
}
