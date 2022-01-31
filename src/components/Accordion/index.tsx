import React from 'react';
import Typography from '@mui/material/Typography';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import { blue } from '@mui/material/colors';

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
    <Box
      onClick={() => onToggle()}
      className='Accordion'
      sx={{
        '&:hover': {
          background: blue[600],
        },
      }}>
      {!expanded ? <ExpandLessIcon fontSize='inherit' /> : <ExpandMoreIcon fontSize='inherit' />}
      {children}
    </Box>
  );
}

export function AccordionBody(props: AccordionBodyProps) {
  const { children, expanded } = props;
  return !expanded ? null : <>{children}</>;
}
