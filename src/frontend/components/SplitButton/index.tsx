import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import Button from "@mui/material/Button";
import ButtonGroup from "@mui/material/ButtonGroup";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Grow from "@mui/material/Grow";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import React from "react";

/** An option in the SplitButton dropdown menu. */
type SplitButtonOption = {
  /** Display text for the menu item. */
  label: string;
  /** Optional icon displayed before the label. */
  startIcon?: React.ReactNode;
  /** Callback when this option is clicked. */
  onClick: () => void;
};

/** Props for the SplitButton component. */
type SplitButtonProps = {
  /** Unique identifier for the button group. */
  id: string;
  /** Label for the primary action button. */
  label: string;
  /** Optional icon for the primary button. */
  startIcon?: React.ReactNode;
  /** Callback for the primary button click. */
  onClick: () => void;
  /** Dropdown menu options. */
  options: SplitButtonOption[];
};

/**
 * A button group with a primary action button and a dropdown arrow revealing additional options.
 * @param props - Configuration including id, label, primary click handler, and dropdown options.
 * @returns The split button group with dropdown menu.
 */
export default function SplitButton(props: SplitButtonProps): React.JSX.Element | null {
  const { id, options, label } = props;
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  const handleMenuItemClick = (index: number) => {
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

  let popperBody: React.JSX.Element = <></>;
  if (options.length === 0) {
    popperBody = <div style={{ padding: "10px 15px" }}>No options.</div>;
  } else {
    popperBody = (
      <MenuList id={id}>
        {options.map((option, index) => (
          <MenuItem key={option.label} onClick={() => handleMenuItemClick(index)}>
            {!option.startIcon ? null : <ListItemIcon>{option.startIcon}</ListItemIcon>}
            <ListItemText sx={{ textAlign: "left" }}>{option.label}</ListItemText>
          </MenuItem>
        ))}
      </MenuList>
    );
  }

  return (
    <React.Fragment>
      <ButtonGroup variant="outlined" ref={anchorRef} aria-label={label}>
        <Button
          onClick={() => {
            props.onClick();
            setOpen(false);
          }}
          startIcon={props.startIcon}
        >
          {label}
        </Button>
        <Button
          aria-controls={open ? id : undefined}
          aria-expanded={open ? "true" : undefined}
          aria-label={label}
          aria-haspopup="menu"
          onClick={handleToggle}
        >
          <ArrowDropDownIcon />
        </Button>
      </ButtonGroup>
      <Popper open={open} anchorEl={anchorRef.current} role={undefined} transition disablePortal>
        {({ TransitionProps, placement }) => (
          <Grow
            {...TransitionProps}
            style={{
              transformOrigin: placement === "bottom" ? "center top" : "center bottom",
            }}
          >
            <Paper>
              <ClickAwayListener onClickAway={handleClose}>{popperBody}</ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
}
