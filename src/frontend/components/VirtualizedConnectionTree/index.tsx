import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import React, { useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { TreeRowRenderer } from './TreeRowRenderer';
import { useFlatTreeRows } from './useFlatTreeRows';

export default function VirtualizedConnectionTree() {
  const { rows, connections, connectionsLoading, onToggle, updateConnections } = useFlatTreeRows();
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row.type === 'column-attributes') return 100;
      return 37;
    },
    overscan: 10,
  });

  const onConnectionOrderChange = useCallback(
    (fromIdx: number, toIdx: number) => {
      updateConnections([fromIdx, toIdx]);
    },
    [updateConnections],
  );

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
              ref={virtualItem.measureElement}
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
