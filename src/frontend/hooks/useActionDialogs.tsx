import { useQuery, useQueryClient } from 'react-query';
import React from 'react';
import { AlertInput } from 'src/frontend/components/ActionDialogs/AlertDialog';
import { ChoiceInput, ChoiceOption } from 'src/frontend/components/ActionDialogs/ChoiceDialog';
import { ModalInput } from 'src/frontend/components/ActionDialogs/ModalDialog';
import { PromptInput } from 'src/frontend/components/ActionDialogs/PromptDialog';

type AlertActionDialog = AlertInput & {
  type: 'alert';
  message: string;
  onSubmit?: () => void;
};

type ConfirmActionDialog = {
  type: 'confirm';
  message: string;
  yesLabel?: string;
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

  const { data } = useQuery(QUERY_KEY_ACTION_DIALOGS, () => _actionDialogs, {
    notifyOnChangeProps: ['data', 'error'],
  });

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

      _actionDialogs = [..._actionDialogs, newActionDialog];

      _invalidateQueries();
    });
  };

  const confirm = (message: string, yesLabel?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'confirm',
        message,
        yesLabel,
        onSubmit: (yesSelected) => {
          yesSelected ? resolve() : reject();
        },
      };

      _actionDialogs = [..._actionDialogs, newActionDialog];

      _invalidateQueries();
    });
  };

  const choice = (
    title: string,
    message: string | React.ReactNode,
    options: ChoiceOption[],
    required?: boolean,
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
        required,
      };

      _actionDialogs = [..._actionDialogs, newActionDialog];

      _invalidateQueries();
    });
  };

  const alert = (message: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'alert',
        message,
      };

      _actionDialogs = [..._actionDialogs, newActionDialog];

      _invalidateQueries();
    });
  };

  const modal = (props: ModalInput): Promise<void> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: 'modal',
        onSubmit: () => {},
        ...props,
      };

      _actionDialogs = [..._actionDialogs, newActionDialog];

      _invalidateQueries();
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

    _actionDialogs = [..._actionDialogs];

    _invalidateQueries();
  };

  function _invalidateQueries() {
    queryClient.invalidateQueries(QUERY_KEY_ACTION_DIALOGS);
  }

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
