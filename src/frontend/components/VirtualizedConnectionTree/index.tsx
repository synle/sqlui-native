import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutModeSetting } from "src/frontend/hooks/useSetting";
import { estimateTreeRowHeight, getTreeRowKey } from "./rowMetrics";
import { TreeRowRenderer } from "./TreeRowRenderer";
import { useFlatTreeRows } from "./useFlatTreeRows";

/** Rows rendered above and below the viewport so they are measured before they scroll into view. */
const OVERSCAN = 10;

/**
 * Virtualized tree view of all database connections, databases, tables, and columns.
 * Supports expanding/collapsing nodes and drag-and-drop reordering of connections.
 * Connection-header rows are kept mounted to preserve drag-and-drop sources.
 */
export default function VirtualizedConnectionTree() {
  const { rows, connections, connectionsLoading, onToggle, updateConnections } = useFlatTreeRows();
  const parentRef = useRef<HTMLDivElement>(null);
  const layoutMode = useLayoutModeSetting();
  const isCompact = layoutMode === "compact";

  const getItemKey = useCallback((index: number) => getTreeRowKey(rows, index), [rows]);
  const estimateSize = useCallback((index: number) => estimateTreeRowHeight(rows, index, isCompact), [rows, isCompact]);

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    getItemKey,
    estimateSize,
    overscan: OVERSCAN,
  });

  const onConnectionOrderChange = useCallback(
    (fromIdx: number, toIdx: number) => {
      updateConnections([fromIdx, toIdx]);
    },
    [updateConnections],
  );

  // Only the layout mode invalidates measurements wholesale: every row changes height at once and
  // the estimates change with it. Tree shape changes must not clear the cache — keyed measurements
  // already follow their rows, and wiping them drops the height of every row that stays mounted.
  useEffect(() => {
    virtualizer.measure();
  }, [layoutMode]);

  if (connectionsLoading) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading Connections...
      </Alert>
    );
  }

  if (!connections || connections.length === 0) {
    return <Alert severity="info">No connnections</Alert>;
  }

  return (
    <div ref={parentRef} className="VirtualizedConnectionTree" style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows[virtualItem.index];
          return (
            <div
              key={row.key}
              className="VirtualizedConnectionTree__Row"
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <TreeRowRenderer row={row} onToggle={onToggle} onConnectionOrderChange={onConnectionOrderChange} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
