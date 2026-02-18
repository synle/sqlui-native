import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useLayoutModeSetting } from 'src/frontend/hooks/useSetting';
import { TreeRowRenderer } from './TreeRowRenderer';
import { useFlatTreeRows } from './useFlatTreeRows';

const ROW_HEIGHT_DEFAULT = 37;
const ROW_HEIGHT_COMPACT = 28;
const ROW_HEIGHT_COLUMN_ATTRIBUTES = 35;

export default function VirtualizedConnectionTree() {
  const { rows, connections, connectionsLoading, onToggle, updateConnections } = useFlatTreeRows();
  const parentRef = useRef<HTMLDivElement>(null);
  const layoutMode = useLayoutModeSetting();
  const isCompact = layoutMode === 'compact';
  const rowHeight = isCompact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_DEFAULT;
  const [transitioning, setTransitioning] = useState(false);

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row.type === 'column-attributes') {
        return (Object.keys(row.column).length + 1) * ROW_HEIGHT_COLUMN_ATTRIBUTES;
      }
      return rowHeight;
    },
    overscan: 10,
  });

  const onConnectionOrderChange = useCallback(
    (fromIdx: number, toIdx: number) => {
      updateConnections([fromIdx, toIdx]);
    },
    [updateConnections],
  );

  const watchedRowsProps = rows.map((r) => ({
    type: r.type,
    key: r.key,
    //@ts-ignore
    isExpanded: r.isExpanded,
  }));

  useLayoutEffect(() => {
    virtualizer.measure();
  }, [layoutMode, JSON.stringify(watchedRowsProps)]);

  if (connectionsLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading Connections...
      </Alert>
    );
  }

  if (!connections || connections.length === 0) {
    return <Alert severity='info'>No connnections</Alert>;
  }

  return (
    <div
      ref={parentRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        contain: 'strict',
      }}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows[virtualItem.index];
          return (
            <div
              key={row.key}
              ref={transitioning ? undefined : virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}>
              <TreeRowRenderer
                row={row}
                onToggle={onToggle}
                onConnectionOrderChange={onConnectionOrderChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
