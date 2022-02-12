import Toast from 'src/components/Toast';
import { ToasterProps } from 'src/hooks/useToaster';
import useToaster from 'src/hooks/useToaster';

export default function Toasters() {
  const { toasts, dismiss } = useToaster();

  if (!toasts || toasts.length === 0) {
    return null;
  }

  const onToastClose = (toast: ToasterProps) => {
    if (toast.onClose) {
      toast.onClose();
    }
    dismiss();
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          open={true}
          onClose={() => onToastClose(toast)}
          message={toast.message}
          anchorOrigin={toast.anchorOrigin}
        />
      ))}
    </>
  );
}
