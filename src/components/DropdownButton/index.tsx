import React from 'react';
import Button from '@mui/material/Button';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';

interface DropdownButtonOption {
  label: string;
  onClick: () => void;
}

interface DropdownButtonProps {
  id: string;
  children: React.ReactNode;
  options: DropdownButtonOption[];
}

export default function DropdownButton(props: DropdownButtonProps) {
  const { id, options, children } = props;
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const handleMenuItemClick = (e: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    options[index].onClick();
    setOpen(false);
  };

  const onToggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen((prevOpen) => !prevOpen);
  };

  const onClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

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
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'right top' : 'right bottom',
            }}>
            <Paper>
              <ClickAwayListener onClickAway={onClose}>
                <MenuList id={id}>
                  {options.map((option, index) => (
                    <MenuItem
                      key={option.label}
                      onClick={(event) => handleMenuItemClick(event, index)}>
                      {option.label}
                    </MenuItem>
                  ))}
                </MenuList>
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
}
