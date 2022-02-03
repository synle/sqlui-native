import React from 'react';
import NativeSelect from '@mui/material/NativeSelect';

type SelectProps = {
  children?: React.ReactNode;
  onChange?: (newValue: string) => void;
  [key: string] : any;
}

export default function Select(props: SelectProps) {
  const { children, onChange, ...restProps } = props;

  return <NativeSelect onChange={(e) => onChange && onChange(e.target.value) } {...restProps}>
        {children}
      </NativeSelect>
}
