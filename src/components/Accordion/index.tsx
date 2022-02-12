import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React from 'react';
import {styled} from '@mui/system';

const StyledAccordionHeader = styled('div')(({ theme }) => {
  const backgroundColor = theme.palette.action.focus;
  return {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    minHeight: '37px',
    borderLeft: '3px solid transparent',
    paddingLeft: '3px',

    '&:hover, &:focus': {
      backgroundColor,
    },

    '&.selected': {
      borderColor: theme.palette.primary.main,
    },

    '*': {
      marginRight: '5px',
    },

    '*:last-child': {
      marginRight: 0,
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
  return (
    <StyledAccordionHeader onClick={() => onToggle()} className={'Accordion__Header ' + className}>
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