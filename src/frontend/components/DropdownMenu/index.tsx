import CircularProgress from '@mui/material/CircularProgress';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Divider from '@mui/material/Divider';
import Grow from '@mui/material/Grow';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import React, { useEffect } from 'react';

export type DropdownButtonOption = {
  label: string;
  startIcon?: React.ReactNode;
  onClick?: (data?: any) => void;
};

type DropdownMenuProps = {
  anchorEl: React.RefObject<HTMLElement>;
  id: string;
  options: DropdownButtonOption[];
  onToggle?: (open: boolean) => void;
  open?: boolean;
  isLoading?: boolean;
  maxHeight?: number | string;
};

export default function DropdownMenu(props: DropdownMenuProps) : JSX.Element | null {
  const { id, options, maxHeight, anchorEl } = props;
  const [open, setOpen] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const handleMenuItemClick = (e: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (options[index].onClick) {
      // @ts-ignore
      options[index].onClick();
      onClose();
    }
  };

  const onToggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen((prevOpen) => !prevOpen);

    props.onToggle && props.onToggle(!open);
  };

  const onClose = () => {
    props.onToggle && props.onToggle(false);
    setOpen(false);
  };

  useEffect(() => {
    setOpen(!!props.open);
  }, [props.open]);

  let popperBody: JSX.Element = <></>;
  if (props.isLoading) {
    popperBody = (
      <div className='DropdownButton__Popper'>
        <CircularProgress size={15} /> Loading... Please wait.
      </div>
    );
  } else if (options.length === 0) {
    popperBody = <div className='DropdownButton__Popper'>No options.</div>;
  } else {
    popperBody = (
      <MenuList id={id}>
        {options.map((option, index) => {
          let content;
          if (option.label === 'divider') {
            return (content = <Divider key={index} sx={{ marginBlock: 1 }} />);
          } else {
            content = (
              <MenuItem onClick={(event) => handleMenuItemClick(event, index)}>
                {!option.startIcon ? null : <ListItemIcon>{option.startIcon}</ListItemIcon>}
                <ListItemText>{option.label}</ListItemText>
              </MenuItem>
            );
          }

          return <div key={option.label}>{content}</div>;
        })}
      </MenuList>
    );
  }

  if (!anchorEl || !anchorEl.current) {
    return null;
  }

  return (
    <React.Fragment>
      <Popper open={open} anchorEl={anchorEl.current} transition>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'right top' : 'right bottom',
            }}>
            <Paper sx={{ maxHeight: maxHeight || '325px', overflow: 'auto' }}>
              <ClickAwayListener onClickAway={onClose} mouseEvent='onMouseDown'>
                {popperBody}
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
}
