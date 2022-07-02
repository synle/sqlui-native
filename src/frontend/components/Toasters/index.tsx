import Toast from 'src/frontend/components/Toast';
import useToaster from 'src/frontend/hooks/useToaster';

export default function Toasters() {
  const { toast, dismiss } = useToaster();

  if (!toast) {
    return null;
  }

  const onToastClose = (reason?: string) => {
    if(reason === 'clickaway'){
      return;
    }

    if (toast.onClose) {
      toast.onClose();
    }
    dismiss(toast.id);
  };

  return (
    <Toast
      open={true}
      onClose={onToastClose}
      message={toast.message}
      autoHideDuration={toast.autoHideDuration}
      anchorOrigin={toast.anchorOrigin}
    />
  );
}
