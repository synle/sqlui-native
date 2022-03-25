import { useQuery, useQueryClient } from 'react-query';
import Toast, { AnchorOrigin } from 'src/frontend/components/Toast';
import { getGeneratedRandomId } from 'src/frontend/utils/commonUtils';

const QUERY_KEY_TOASTS = 'toasts';

type CoreToasterProps = {
  onClose?: () => void;
  message: string;
  anchorOrigin?: AnchorOrigin;
  autoHideDuration?: number;
};

type ToasterProps = CoreToasterProps & {
  id: string;
};

export type ToasterHandler = {
  dismiss: (dismissDelay?: number) => void;
};

let _toasts: ToasterProps[] = [];

const DEFAULT_AUTO_HIDE_DURATION = 6000;

export default function useToaster() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(QUERY_KEY_TOASTS, () => _toasts);

  const add = (props: CoreToasterProps): Promise<ToasterHandler> => {
    return new Promise((resolve, reject) => {
      const toastId = getGeneratedRandomId(`toasterId`);
      _toasts.push({
        ...props,
        id: toastId,
        autoHideDuration: props.autoHideDuration || DEFAULT_AUTO_HIDE_DURATION,
      });
      queryClient.invalidateQueries(QUERY_KEY_TOASTS);

      resolve({
        dismiss: (dismissDelay?: number) => {
          dismiss(toastId, dismissDelay);
        },
      });
    });
  };

  const dismiss = (toastId: string, dismissDelay?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        _toasts = _toasts.filter((toast) => toast.id !== toastId);
        queryClient.invalidateQueries(QUERY_KEY_TOASTS);
        resolve();
      }, dismissDelay || 0);
    });
  };

  let toast;
  try {
    if (data) {
      toast = data[data.length - 1];
    }
  } catch (err) {
    toast = undefined;
  }

  return {
    toasts: data,
    toast,
    isLoading,
    add,
    dismiss,
  };
}