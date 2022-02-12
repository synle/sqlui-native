import Button from '@mui/material/Button';
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
import {useEffect} from 'react';
import React from 'react';

interface DropdownButtonOption {
  label: string;
  startIcon?: React.ReactNode;
  onClick?: () => void;
}

interface DropdownButtonProps {
  id: string;
  children: React.ReactNode;
  options: DropdownButtonOption[];
  onToggle?: (open: boolean) => void;
  open?: boolean;
  isLoading?: boolean;
}

export default function DropdownButton(props: DropdownButtonProps) {
  const { id, options, children } = props;
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const handleMenuItemClick = (e: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (options[index].onClick) {
      // @ts-ignore
      options[index].onClick();
      setOpen(false);
    }
  };

  const onToggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen((prevOpen) => !prevOpen);

    props.onToggle && props.onToggle(!open);
  };

  const onClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  useEffect(() => {
    setOpen(!!props.open);
  }, [props.open]);

  let popperBody: React.ReactElement = <></>;
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

  return (
    <React.Fragment>
      <i
        ref={anchorRef}
        aria-controls={open ? id : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-label='actions dropdown'
        aria-haspopup='menu'
        onClick={onToggle}>
        {children}
      </i>
      <Popper open={open} anchorEl={anchorRef.current} transition>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'right top' : 'right bottom',
            }}>
            <Paper sx={{ maxHeight: '325px', overflow: 'auto' }}>
              <ClickAwayListener onClickAway={onClose}>{popperBody}</ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
}