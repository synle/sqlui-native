import { useQuery } from 'react-query';
import { useQueryClient } from 'react-query';
import React from 'react';
 import Toast from 'src/components/Toast';


const QUERY_KEY_TOASTS = 'toasts';


type ToasterProps = {
  onClose?: () => void;
  message: string;
}

let _toasts : ToasterProps []= [];

export default function useToaster() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(QUERY_KEY_TOASTS, () => _toasts);

  const add = (props: ToasterProps): Promise<void> => {
    return new Promise((resolve, reject) => {
      _toasts.push(props);
      queryClient.invalidateQueries(QUERY_KEY_TOASTS);
      resolve();
    });
  };

  const dismiss = (dismissDelay?: number): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(
        () => {
          if(_toasts.length > 0){
        _toasts.pop();
      }
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
  }
}
