import React from 'react';
import Typography from '@mui/material/Typography';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import { styled, createTheme, ThemeProvider } from '@mui/system';

const StyledAccordionHeader = styled('div')(({ theme }) => {
  const backgroundColor = theme.palette.grey[800];

  return {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    minHeight: '37px',

    '&:hover, &:focus': {
      backgroundColor,
      color: theme.palette.getContrastText(backgroundColor),
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
};

export function AccordionHeader(props: AccordionHeaderProps) {
  const { children, expanded, onToggle } = props;
  return (
    <StyledAccordionHeader onClick={() => onToggle()} className='Accordion'>
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
