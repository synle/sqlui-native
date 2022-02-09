import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Grow from '@mui/material/Grow';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import React from 'react';
interface SplitButtonOption {
  label: string;
  startIcon?: React.ReactNode;
  onClick: () => void;
}

interface SplitButtonProps {
  id: string;
  label: string;
  startIcon?: React.ReactNode;
  onClick: () => void;
  options: SplitButtonOption[];
}

export default function SplitButton(props: SplitButtonProps) {
  const { id, options, label } = props;
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(1);

  const handleMenuItemClick = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    index: number,
  ) => {
    options[index].onClick();
    setOpen(false);
  };

  const handleToggle = () => {
    setOpen((prevOpen) => !prevOpen);
  };

  const handleClose = (event: Event) => {
    if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
      return;
    }

    setOpen(false);
  };

  let popperBody: React.ReactElement = <></>;
  if (options.length === 0) {
    popperBody = <div style={{ padding: '10px 15px' }}>No options.</div>;
  } else {
    popperBody = (
      <MenuList id={id}>
        {options.map((option, index) => (
          <MenuItem key={option.label} onClick={(event) => handleMenuItemClick(event, index)}>
            {!option.startIcon ? null : <ListItemIcon>{option.startIcon}</ListItemIcon>}
            <ListItemText>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </MenuList>
    );
  }

  return (
    <React.Fragment>
      <ButtonGroup variant='outlined' ref={anchorRef} aria-label={label}>
        <Button
          onClick={() => {
            props.onClick();
            setOpen(false);
          }}
          startIcon={props.startIcon}>
          {label}
        </Button>
        <Button
          aria-controls={open ? id : undefined}
          aria-expanded={open ? 'true' : undefined}
          aria-label={label}
          aria-haspopup='menu'
          onClick={handleToggle}>
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
            }}>
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>{popperBody}</ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
}
