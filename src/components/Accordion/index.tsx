import React from 'react';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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
    <div className='Accordion' onClick={() => onToggle()}>
      {!expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      {children}
    </div>
  );
}

export function AccordionBody(props: AccordionBodyProps) {
  const { children, expanded } = props;
  return !expanded ? null : <>{children}</>;
}
