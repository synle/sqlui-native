import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React from 'react';
import { styled } from '@mui/system';

const StyledAccordionHeader = styled('div')(({ theme }) => {
  return {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    minHeight: '37px',
    paddingLeft: '3px',
    gap: '5px',

    '&:hover': {
      backgroundColor: theme.palette.action.focus,
    },

    '&:focus-within, &:focus': {
      backgroundColor: theme.palette.action.hover,
    },

    '&.selected': {
      backgroundColor: theme.palette.action.selected,
    },

    '> span': {
      flexGrow: '1',
      fontWeight: 'bold',
      display: 'block',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  };
});

type AccordionBodyProps = {
  children: React.ReactNode[] | React.ReactNode;
  expanded: boolean;
};

type AccordionHeaderProps = AccordionBodyProps & {
  onToggle: () => void;
  className?: string;
};

export function AccordionHeader(props: AccordionHeaderProps) {
  const { children, expanded, onToggle, className } = props;
  const onShowActions = (e: React.SyntheticEvent) => {
    e.preventDefault();

    const actionButton = e.currentTarget.querySelector('.DropdownButton') as HTMLButtonElement;
    actionButton?.click?.();
  };
  return (
    <StyledAccordionHeader
      onClick={() => onToggle()}
      className={'Accordion__Header ' + className}
      onContextMenu={onShowActions}>
      {!expanded ? (
        <ExpandLessIcon fontSize='inherit' color='inherit' />
      ) : (
        <ExpandMoreIcon fontSize='inherit' color='inherit' />
      )}
      {children}
    </StyledAccordionHeader>
  );
}

export function AccordionBody(props: AccordionBodyProps) {
  const { children, expanded } = props;
  return !expanded ? null : <>{children}</>;
}
