import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Sqlui, SqluiNative } from 'typings';
import AlertDialog from 'src/components/ActionDialogs/AlertDialog';

interface ActionDialogsProps {}

export default function ActionDialogs(props: ActionDialogsProps) {
  const { dialog, dismiss } = useActionDialogs();

  if (!dialog) {
    return null;
  }

  // TODO: implement me
  const onYesClick = () => {
    dismiss();
    dialog.onSubmit(true);
  };
  const onNoClick = () => {
    dismiss();
    dialog.onSubmit(false);
  };
  switch (dialog.type) {
    case 'confirm':
      return (
        <AlertDialog
          open={true}
          title='Confirmation?'
          message={dialog.message}
          onYesClick={onYesClick}
          onNoClick={onNoClick}
        />
      );
  }
  return null;
}

// used for show and hide the sidebar trees
type ActionDialog =
  | {
      type: 'confirm';
      message: string;
      onSubmit: (yesSelected: boolean) => void;
    }
  | {
      type: 'prompt';
      message: string;
      defaultValue?: string;
      onSubmit: (yesSelected: boolean, newValue?: string) => void;
    };

const QUERY_KEY_ACTION_DIALOGS = 'actionDialogs';
let _actionDialogs: ActionDialog[] = [];

export function useActionDialogs() {
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery(QUERY_KEY_ACTION_DIALOGS, () => _actionDialogs);

  const prompt = (message: string, defaultValue: string) => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'prompt',
        message,
        defaultValue,
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
    prompt,
    confirm,
    dismiss,
  };
}
