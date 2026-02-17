import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import React from 'react';
import { styled } from '@mui/system';
// these are drag and drop index
let fromIdx: number | undefined, toIdx: number | undefined;

function _getIndex(currentTarget: Element) {
  const connectionElems = document.querySelectorAll('.Accordion__Header.ConnectionDescription');
  for (let i = 0; i < connectionElems.length; i++) {
    const connectionElem = connectionElems[i];
    if (connectionElem === currentTarget) {
      return i;
    }
  }
}

const StyledAccordionHeader = styled('div')(({ theme }) => {
  return {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    minHeight: '37px',
    gap: '5px',

    '&:hover, &:focus-within, &:focus': {
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
  onOrderChange?: (fromIdx: number, toIdx: number) => void;
  connectionIndex?: number;
};

export function AccordionHeader(props: AccordionHeaderProps): JSX.Element | null {
  const { children, expanded, onToggle, className } = props;

  const onShowActions = (e: React.SyntheticEvent) => {
    e.preventDefault();

    const actionButton = e.currentTarget.querySelector('.DropdownButton') as HTMLButtonElement;
    actionButton?.click?.();
  };

  const onDragStart = (e: React.DragEvent) => {
    if (props.connectionIndex !== undefined) {
      fromIdx = props.connectionIndex;
      e.dataTransfer.setData('text/plain', String(props.connectionIndex));
    } else {
      fromIdx = _getIndex(e.currentTarget);
    }
    toIdx = undefined;
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.MouseEvent) => {
    if (props.connectionIndex !== undefined) {
      toIdx = props.connectionIndex;
    } else {
      toIdx = _getIndex(e.currentTarget);
    }

    if (fromIdx !== undefined && toIdx !== undefined && props.onOrderChange !== undefined) {
      props.onOrderChange(fromIdx, toIdx);
    }
  };

  const dragAndDropProps = props.onOrderChange
    ? {
        draggable: true,
        onDragStart: onDragStart,
        onDragOver: onDragOver,
        onDrop: onDrop,
      }
    : undefined;

  return (
    <StyledAccordionHeader
      {...dragAndDropProps}
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

export function AccordionBody(props: AccordionBodyProps): JSX.Element | null {
  const { children, expanded } = props;
  return !expanded ? null : <>{children}</>;
}
