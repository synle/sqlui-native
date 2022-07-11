import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import NativeSelect from '@mui/material/NativeSelect';
import React from 'react';
import { styled } from '@mui/system';

const StyledSelect = styled('select')(({ theme }) => {
  return {
    cursor: 'pointer',
    outline: 'none',
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    background: 'initial',
    color: theme.palette.text.secondary,
    borderColor: theme.palette.action.selected,

    option: {
      background: theme.palette.background.default,
      color: theme.palette.text.primary,
    },

    '&:hover, &:focus': {
      borderColor: theme.palette.primary.main,
    },

    '&:disabled': {
      color: theme.palette.action.disabled,
      borderColor: theme.palette.action.disabledBackground,
    },
  };
});

type SelectProps = {
  label?: string;
  required?: boolean;
  children?: React.ReactNode;
  onChange?: (newValue: string) => void;
  [key: string]: any;
};

export default function Select(props: SelectProps) {
  const { label, children, onChange, ...restProps } = props;

  if (label) {
    const controlId = `select-${Date.now()}-${label.replace(/[ -_]/g, '-')}`;
    return <FormControl sx={{width: '250px'}} variant='filled'
        size='small'>
      <InputLabel variant='standard' htmlFor={controlId}>
        {label}
      </InputLabel>
      <NativeSelect
        required
        onChange={(e) => onChange && onChange(e.target.value)}
        {...restProps}
        inputProps={{
          id: controlId,
        }}
        size='small'>
        {children}
      </NativeSelect>
    </FormControl>;
  }

  return (
    <StyledSelect onChange={(e) => onChange && onChange(e.target.value)} {...restProps}>
      {children}
    </StyledSelect>
  );
}
