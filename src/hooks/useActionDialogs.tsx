import {useQuery} from 'react-query';
import {useQueryClient} from 'react-query';
import React from 'react';
import {ChoiceInput} from 'src/components/ActionDialogs/ChoiceDialog';
import {ChoiceOption} from 'src/components/ActionDialogs/ChoiceDialog';
import {ModalInput} from 'src/components/ActionDialogs/ModalDialog';
import {PromptInput} from 'src/components/ActionDialogs/PromptDialog';
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