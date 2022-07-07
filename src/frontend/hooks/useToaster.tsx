import { useQuery, useQueryClient } from 'react-query';
import React from 'react';
import Toast, { AnchorOrigin } from 'src/frontend/components/Toast';
import { getGeneratedRandomId } from 'src/frontend/utils/commonUtils';

const QUERY_KEY_TOASTS = 'toasts';

type CoreToasterProps = {
  onClose?: () => void;
  message: string | React.ReactElement;
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

  const { data, isLoading } = useQuery(QUERY_KEY_TOASTS, () => _toasts, {
    notifyOnChangeProps: ['data', 'error'],
  });

  const add = (props: CoreToasterProps): Promise<ToasterHandler> => {
    return new Promise((resolve, reject) => {
      const toastId = getGeneratedRandomId(`toasterId`);

      _toasts = [
        ..._toasts,
        {
          ...props,
          id: toastId,
          autoHideDuration: props.autoHideDuration || DEFAULT_AUTO_HIDE_DURATION,
        },
      ];

      resolve({
        dismiss: (dismissDelay?: number) => {
          dismiss(toastId, dismissDelay);
        },
      });

      _invalidateQueries();
    });
  };

  const dismiss = (toastId: string, dismissDelay?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        _toasts = _toasts.filter((toast) => toast.id !== toastId);

        resolve();

        _invalidateQueries();
      }, dismissDelay || 0);
    });
  };

  function _invalidateQueries() {
    queryClient.invalidateQueries(QUERY_KEY_TOASTS);
  }

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
