import React from 'react';
import {styled} from '@mui/system';
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
  children?: React.ReactNode;
  onChange?: (newValue: string) => void;
  [key: string]: any;
};

export default function Select(props: SelectProps) {
  const { children, onChange, ...restProps } = props;

  //@ts-ignore
  return (
    <StyledSelect onChange={(e) => onChange && onChange(e.target.value)} {...restProps}>
      {children}
    </StyledSelect>
  );
}