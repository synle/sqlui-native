import React, { useEffect } from 'react';
import DropdownMenu from 'src/frontend/components/DropdownMenu';

export type { DropdownButtonOption } from 'src/frontend/components/DropdownMenu';

type DropdownButtonProps = {
  id: string;
  children: React.ReactNode;
  options: import('src/frontend/components/DropdownMenu').DropdownButtonOption[];
  onToggle?: (open: boolean) => void;
  open?: boolean;
  isLoading?: boolean;
  maxHeight?: number | string;
};

export default function DropdownButton(props: DropdownButtonProps): JSX.Element | null {
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
        aria-expanded={open ? 'true' : undefined}
        aria-label='actions dropdown'
        aria-haspopup='menu'
        onClick={onToggle}
        className='DropdownButton'>
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
