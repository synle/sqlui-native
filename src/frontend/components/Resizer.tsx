import React, { useCallback, useEffect, useRef, useState } from 'react';

type ContainerProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

type SectionProps = React.HTMLAttributes<HTMLDivElement> & {
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  onSizeChanged?: (size: number) => void;
  children: React.ReactNode;
};

type BarProps = React.HTMLAttributes<HTMLDivElement> & {
  size: number;
};

export function Container({ children, style, ...rest }: ContainerProps) {
  const [sectionSize, setSectionSize] = useState<number | null>(null);
  const sizeRef = useRef<number | null>(null);
  const sectionPropsRef = useRef<{
    defaultSize?: number;
    minSize?: number;
    maxSize?: number;
    onSizeChanged?: (size: number) => void;
  }>({});

  // Extract first Section's props into the ref via effect (not during render)
  const childArray = React.Children.toArray(children);
  const firstSectionChild = childArray.find(
    (c) => React.isValidElement(c) && c.type === Section,
  );
  const firstSectionProps = React.isValidElement(firstSectionChild)
    ? (firstSectionChild.props as SectionProps)
    : undefined;

  useEffect(() => {
    if (firstSectionProps) {
      sectionPropsRef.current = {
        defaultSize: firstSectionProps.defaultSize,
        minSize: firstSectionProps.minSize,
        maxSize: firstSectionProps.maxSize,
        onSizeChanged: firstSectionProps.onSizeChanged,
      };
    }
  });

  const handleDrag = useCallback((deltaX: number) => {
    setSectionSize((prev) => {
      const { defaultSize = 300, minSize = 0, maxSize = Infinity } = sectionPropsRef.current;
      const current = prev ?? defaultSize;
      const next = Math.min(maxSize, Math.max(minSize, current + deltaX));
      sizeRef.current = next;
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    if (sizeRef.current != null && sectionPropsRef.current.onSizeChanged) {
      sectionPropsRef.current.onSizeChanged(sizeRef.current);
    }
  }, []);

  let foundFirstSection = false;
  const rendered = childArray.map((child, i) => {
    if (!React.isValidElement(child)) return child;

    if (child.type === Section) {
      const sectionProps = child.props as SectionProps;

      if (!foundFirstSection) {
        foundFirstSection = true;
        const width = sectionSize ?? sectionProps.defaultSize;
        return React.cloneElement(child, {
          key: i,
          style: {
            ...sectionProps.style,
            width: width != null ? `${width}px` : undefined,
            flexShrink: 0,
          },
        } as any);
      }

      return React.cloneElement(child, {
        key: i,
        style: { ...sectionProps.style, flex: 1, minWidth: 0 },
      } as any);
    }

    if (child.type === Bar) {
      return React.cloneElement(child, {
        key: i,
        _onDrag: handleDrag,
        _onDragEnd: handleDragEnd,
      } as any);
    }

    return child;
  });

  return (
    <div style={{ display: 'flex', ...style }} {...rest}>
      {rendered}
    </div>
  );
}

export function Section({
  defaultSize,
  minSize,
  maxSize,
  onSizeChanged,
  children,
  ...rest
}: SectionProps) {
  return <div {...rest}>{children}</div>;
}

type BarInternalProps = BarProps & {
  _onDrag?: (deltaX: number) => void;
  _onDragEnd?: () => void;
};

export function Bar({ size, style, _onDrag, _onDragEnd, ...rest }: BarInternalProps) {
  const dragging = useRef(false);
  const lastX = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      lastX.current = e.clientX;

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = ev.clientX - lastX.current;
        lastX.current = ev.clientX;
        _onDrag?.(delta);
      };

      const onMouseUp = () => {
        dragging.current = false;
        _onDragEnd?.();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [_onDrag, _onDragEnd],
  );

  return (
    <div
      style={{
        width: `${size}px`,
        flexShrink: 0,
        cursor: 'col-resize',
        ...style,
      }}
      onMouseDown={onMouseDown}
      {...rest}
    />
  );
}
