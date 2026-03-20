import React, { createContext, useContext, useState } from "react";
import { AlertInput } from "src/frontend/components/ActionDialogs/AlertDialog";
import { ChoiceInput, ChoiceOption } from "src/frontend/components/ActionDialogs/ChoiceDialog";
import { ModalInput } from "src/frontend/components/ActionDialogs/ModalDialog";
import { PromptInput } from "src/frontend/components/ActionDialogs/PromptDialog";

/** Action dialog configuration for alert-type dialogs. */
type AlertActionDialog = AlertInput & {
  type: "alert";
  message: string;
  onSubmit?: () => void;
};

/** Action dialog configuration for confirm-type dialogs. */
type ConfirmActionDialog = {
  type: "confirm";
  message: string;
  yesLabel?: string;
  isFullScreen?: boolean;
  onSubmit: (yesSelected: boolean) => void;
};

/** Action dialog configuration for choice-type dialogs with selectable options. */
type ChoiceActionDialog = ChoiceInput & {
  type: "choice";
  onSubmit: (yesSelected: boolean, selectedChoice?: string) => void;
};

/** Action dialog configuration for prompt-type dialogs with text input. */
type PromptActionDialog = PromptInput & {
  type: "prompt";
  onSubmit: (yesSelected: boolean, newValue?: string) => void;
};

/** Action dialog configuration for modal-type dialogs with custom content. */
type ModalActionDialog = ModalInput & {
  type: "modal";
  onSubmit: (closed: boolean) => void;
};

/** Union type representing any action dialog configuration. */
type ActionDialog = AlertActionDialog | ConfirmActionDialog | PromptActionDialog | ChoiceActionDialog | ModalActionDialog;

let _actionDialogs: ActionDialog[] = [];

//
const TargetContext = createContext({
  data: _actionDialogs,
  setData: (_newDialogs: ActionDialog[]) => {},
});

/**
 * Context provider for the action dialogs system.
 * @param props - Component props containing child elements.
 * @returns The context provider wrapping children.
 */
export default function WrappedContext(props: { children: React.ReactNode }): JSX.Element | null {
  // State to hold the theme value
  const [data, setData] = useState(_actionDialogs);
  // Provide the theme value and toggle function to the children components
  return <TargetContext.Provider value={{ data, setData }}>{props.children}</TargetContext.Provider>;
}

/**
 * Hook providing methods to show alert, confirm, prompt, choice, and modal dialogs.
 * @returns Dialog state and methods to trigger and dismiss dialogs.
 */
export function useActionDialogs() {
  const { data, setData } = useContext(TargetContext)!;

  const prompt = (props: PromptInput): Promise<string | undefined> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        ...props,
        type: "prompt",
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
        type: "confirm",
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

  const choice = (title: string, message: string | React.ReactNode, options: ChoiceOption[], required?: boolean): Promise<string> => {
    return new Promise((resolve, reject) => {
      const newActionDialog: ActionDialog = {
        type: "choice",
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
    return new Promise(() => {
      const newActionDialog: ActionDialog = {
        type: "alert",
        message,
      };

      _actionDialogs = [..._actionDialogs, newActionDialog];
      _invalidateQueries();
    });
  };

  const modal = (props: ModalInput): Promise<void> => {
    return new Promise(() => {
      const newActionDialog: ActionDialog = {
        type: "modal",
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
    console.error("useActionDialogs.tsx:_invalidateQueries", err);
    dialog = undefined;
  }

  const dismiss = () => {
    _actionDialogs.pop();

    _actionDialogs = [..._actionDialogs];

    _invalidateQueries();
  };

  function _invalidateQueries() {
    setData(_actionDialogs);
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
