import React, { useEffect } from "react";
import DropdownMenu from "src/frontend/components/DropdownMenu";

/** Re-exported type for dropdown menu option items. */
export type { DropdownButtonOption } from "src/frontend/components/DropdownMenu";

/** Props for the DropdownButton component. */
type DropdownButtonProps = {
  /** Unique identifier for the dropdown menu. */
  id: string;
  /** The clickable trigger element rendered inside the button. */
  children: React.ReactNode;
  /** Menu options to display in the dropdown. */
  options: import("src/frontend/components/DropdownMenu").DropdownButtonOption[];
  /** Callback fired when the dropdown open state changes. */
  onToggle?: (open: boolean) => void;
  /** Controlled open state. */
  open?: boolean;
  /** Whether the dropdown is in a loading state. */
  isLoading?: boolean;
  /** Maximum height of the dropdown menu. */
  maxHeight?: number | string;
};

/**
 * A button that toggles a dropdown menu (DropdownMenu) on click.
 * Wraps children as the trigger element and manages open/close state.
 * @param props - Dropdown button configuration including options and toggle callback.
 * @returns The dropdown button with attached menu.
 */
export default function DropdownButton(props: DropdownButtonProps): React.JSX.Element | null {
  const { id, options, children, maxHeight } = props;
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLDivElement>(null);

  const onToggle = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setOpen((prevOpen) => !prevOpen);

    props.onToggle && props.onToggle(!open);
  };

  useEffect(() => {
    setOpen(!!props.open);
  }, [props.open]);

  return (
    <React.Fragment>
      <i
        ref={anchorRef}
        aria-controls={open ? id : undefined}
        aria-expanded={open ? "true" : undefined}
        aria-label="actions dropdown"
        aria-haspopup="menu"
        onClick={onToggle}
        className="DropdownButton"
      >
        {children}
      </i>
      <DropdownMenu
        id={id}
        options={options}
        open={open}
        onToggle={(newOpen) => {
          setOpen(newOpen);
          props.onToggle && props.onToggle(newOpen);
        }}
        isLoading={props.isLoading}
        maxHeight={maxHeight}
        anchorEl={anchorRef}
      />
    </React.Fragment>
  );
}
