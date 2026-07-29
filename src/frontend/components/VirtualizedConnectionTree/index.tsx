import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useCallback, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useLayoutModeSetting } from "src/frontend/hooks/useSetting";
import { TreeRowRenderer } from "./TreeRowRenderer";
import { useFlatTreeRows } from "./useFlatTreeRows";

/** Default row height in pixels for tree rows. */
const ROW_HEIGHT_DEFAULT = 37;
/** Compact mode row height in pixels. */
const ROW_HEIGHT_COMPACT = 28;
/** Row height in pixels for column attribute detail rows. */
const ROW_HEIGHT_COLUMN_ATTRIBUTES = 35;

/**
 * Virtualized tree view of all database connections, databases, tables, and columns.
 * Supports expanding/collapsing nodes and drag-and-drop reordering of connections.
 * Connection-header rows are kept mounted to preserve drag-and-drop sources.
 */
export default function VirtualizedConnectionTree() {
  const { rows, rowFingerprint, connections, connectionsLoading, onToggle, updateConnections } = useFlatTreeRows();
  const parentRef = useRef<HTMLDivElement>(null);
  const layoutMode = useLayoutModeSetting();
  const isCompact = layoutMode === "compact";
  const rowHeight = isCompact ? ROW_HEIGHT_COMPACT : ROW_HEIGHT_DEFAULT;

  const virtualizer = useVirtualizer<HTMLDivElement, HTMLDivElement>({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (row.type === "column-attributes") {
        return (Object.keys(row.column).length + 1) * ROW_HEIGHT_COLUMN_ATTRIBUTES;
      }
      return rowHeight;
    },
    measureElement: (element) => element?.getBoundingClientRect().height ?? rowHeight,
  });

  const onConnectionOrderChange = useCallback(
    (fromIdx: number, toIdx: number) => {
      updateConnections([fromIdx, toIdx]);
    },
    [updateConnections],
  );

  useEffect(() => {
    virtualizer.measure();
  }, [layoutMode, rowFingerprint]);

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
    <div ref={parentRef} style={{ flex: 1, overflowY: "auto" }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: "relative" }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const row = rows[virtualItem.index];
          return (
            <div
              key={row.key}
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
