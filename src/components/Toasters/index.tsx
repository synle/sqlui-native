import { useQuery } from 'react-query';
import { useQueryClient } from 'react-query';
import React from 'react';
import Toast from 'src/components/Toast';
import useToaster from 'src/hooks/useToaster';

export default function Toasters() {
  const { toast, dismiss } = useToaster();

  if (!toast) {
    return null;
  }

  const onToastClose = () => {
    if (toast.onClose) {
      toast.onClose();
    }
    dismiss();
  };

  return <Toast open={true} onClose={onToastClose} message={toast.message} />;
}
