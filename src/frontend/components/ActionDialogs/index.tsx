import AlertDialog from "src/frontend/components/ActionDialogs/AlertDialog";
import ChoiceDialog from "src/frontend/components/ActionDialogs/ChoiceDialog";
import ModalDialog from "src/frontend/components/ActionDialogs/ModalDialog";
import PromptDialog from "src/frontend/components/ActionDialogs/PromptDialog";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

type ActionDialogsProps = {};

export default function ActionDialogs(props: ActionDialogsProps): JSX.Element | null {
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
    case "alert":
      return <AlertDialog open={true} title="Alert" message={dialog.message} onDismiss={onDimiss} isConfirm={false} />;
    case "confirm":
      return (
        <AlertDialog
          open={true}
          title="Confirmation"
          message={dialog.message}
          yesLabel={dialog.yesLabel}
          onYesClick={onConfirmSubmit}
          onDismiss={onDimiss}
          isConfirm={true}
        />
      );
    case "prompt":
      return (
        <PromptDialog
          open={true}
          title={dialog.title}
          message={dialog.message}
          value={dialog.value}
          onSaveClick={onPromptSaveClick}
          onDismiss={onDimiss}
          languageMode={dialog.languageMode}
          isLongPrompt={dialog.isLongPrompt}
          saveLabel={dialog.saveLabel}
          required={dialog.required}
          readonly={dialog.readonly}
        />
      );
    case "choice":
      return (
        <ChoiceDialog
          open={true}
          title={dialog.title}
          message={dialog.message}
          options={dialog.options}
          onSelect={onChoiceSelect}
          onDismiss={onDimiss}
          required={dialog.required}
        />
      );
    case "modal":
      return (
        <ModalDialog
          open={true}
          title={dialog.title}
          message={dialog.message}
          onDismiss={onDimiss}
          showCloseButton={!!dialog.showCloseButton}
          disableBackdropClick={!!dialog.disableBackdropClick}
          size={dialog.size}
        />
      );
  }
  return null;
}
