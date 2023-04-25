import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import NativeSelect from '@mui/material/NativeSelect';
import OutlinedInput from '@mui/material/OutlinedInput';
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

export default function Select(props: SelectProps): JSX.Element | null {
  const { value, label, children, onChange, ...restProps } = props;

  if (label) {
    // https://github.com/mui/material-ui/issues/32197
    const controlId = `select-${Date.now()}-${label.replace(/[ -_]/g, '-')}`;
    return (
      <FormControl variant='outlined' size='small'>
        <InputLabel variant='outlined' htmlFor={controlId} shrink={true} margin='dense'>
          {label}
        </InputLabel>
        <NativeSelect
          input={<OutlinedInput label={label} notched={true} />}
          inputProps={{
            id: controlId,
          }}
          value={value}
          onChange={(e) => onChange && onChange(e.target.value)}>
          {children}
        </NativeSelect>
      </FormControl>
    );
  }

  return (
    <StyledSelect
      onChange={(e) => onChange && onChange(e.target.value)}
      value={value}
      {...restProps}>
      {children}
    </StyledSelect>
  );
}
