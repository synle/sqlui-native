import CircularProgress from "@mui/material/CircularProgress";
import ClickAwayListener from "@mui/material/ClickAwayListener";
import Divider from "@mui/material/Divider";
import Grow from "@mui/material/Grow";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import MenuList from "@mui/material/MenuList";
import Paper from "@mui/material/Paper";
import Popper from "@mui/material/Popper";
import React, { useEffect } from "react";

/** A single option item in a dropdown menu. */
export type DropdownButtonOption = {
  /** Display label; use "divider" for a separator line. */
  label: string;
  /** Optional icon rendered before the label. */
  startIcon?: React.ReactNode;
  /** Callback invoked when this option is selected. */
  onClick?: (data?: any) => void;
};

/** Props for the DropdownMenu component. */
type DropdownMenuProps = {
  /** Ref to the anchor element the popper is positioned relative to. */
  anchorEl: React.RefObject<HTMLElement>;
  /** Unique identifier for the menu list. */
  id: string;
  /** Menu options to render. */
  options: DropdownButtonOption[];
  /** Callback fired when the menu open state changes. */
  onToggle?: (open: boolean) => void;
  /** Controlled open state. */
  open?: boolean;
  /** Whether the menu should show a loading spinner. */
  isLoading?: boolean;
  /** Maximum height of the scrollable menu area. */
  maxHeight?: number | string;
};

/**
 * A popper-based dropdown menu rendered as a MUI MenuList.
 * Supports loading state, divider items, icons, and click-away dismissal.
 * @param props - Menu configuration including anchor element, options, and open state.
 * @returns A positioned dropdown menu, or null if no anchor element is available.
 */
export default function DropdownMenu(props: DropdownMenuProps): JSX.Element | null {
  const { id, options, maxHeight, anchorEl } = props;
  const [open, setOpen] = React.useState(false);

  const handleMenuItemClick = (e: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (options[index].onClick) {
      // @ts-ignore
      options[index].onClick();
      onClose(e);
    }
  };

  const onClose = (event: Event | React.SyntheticEvent) => {
    if (anchorEl?.current && anchorEl.current.contains(event.target as HTMLElement)) {
      return;
    }
    props.onToggle && props.onToggle(false);
    setOpen(false);
  };

  useEffect(() => {
    setOpen(!!props.open);
  }, [props.open]);

  let popperBody: JSX.Element = <></>;
  if (props.isLoading) {
    popperBody = (
      <div className="DropdownButton__Popper">
        <CircularProgress size={15} /> Loading... Please wait.
      </div>
    );
  } else if (options.length === 0) {
    popperBody = <div className="DropdownButton__Popper">No options.</div>;
  } else {
    popperBody = (
      <MenuList id={id}>
        {options.map((option, index) => {
          let content;
          if (option.label === "divider") {
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
              transformOrigin: placement === "bottom" ? "right top" : "right bottom",
            }}
          >
            <Paper sx={{ maxHeight: maxHeight || "325px", overflow: "auto" }}>
              <ClickAwayListener onClickAway={onClose} mouseEvent="onMouseDown">
                {popperBody}
              </ClickAwayListener>
            </Paper>
          </Grow>
        )}
      </Popper>
    </React.Fragment>
  );
}
