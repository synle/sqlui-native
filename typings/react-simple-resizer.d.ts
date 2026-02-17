declare module 'react-simple-resizer' {
  import * as React from 'react';

  interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    vertical?: boolean;
    beforeApplyResizer?: (resizer: any) => any;
    afterResizing?: () => void;
    onActivate?: () => void;
  }

  interface SectionProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number;
    defaultSize?: number;
    maxSize?: number;
    minSize?: number;
    disableResponsive?: boolean;
    innerRef?: React.RefObject<HTMLDivElement>;
    onSizeChanged?: (currentSize: number) => void;
  }

  interface BarProps extends React.HTMLAttributes<HTMLDivElement> {
    size: number;
    expandInteractiveArea?: {
      top?: number;
      left?: number;
      right?: number;
      bottom?: number;
    };
    innerRef?: React.RefObject<HTMLDivElement>;
    onStatusChanged?: (isActive: boolean) => void;
  }

  export const Container: React.FC<ContainerProps>;
  export const Section: React.FC<SectionProps>;
  export const Bar: React.FC<BarProps>;
}
