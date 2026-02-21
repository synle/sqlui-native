import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getToastHistory, ToastHistoryEntry } from "src/frontend/hooks/useToaster";

const EXTRA_COLLAPSED_LENGTH = 100;
const ESTIMATED_ROW_HEIGHT = 60;

function formatTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function matchesFilter(entry: ToastHistoryEntry, filter: string): boolean {
  const lower = filter.toLowerCase();
  if (entry.id?.toLowerCase().includes(lower)) return true;
  if (typeof entry.message === "string" && entry.message.toLowerCase().includes(lower)) return true;
  if (entry.extra && entry.extra.toLowerCase().includes(lower)) return true;
  return false;
}

function ExtraBlock({
  extra,
  expanded,
  onToggle,
}: {
  extra: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [localExpanded, setLocalExpanded] = useState(expanded);

  useEffect(() => {
    setLocalExpanded(expanded);
  }, [expanded]);

  const needsTruncation = extra.length > EXTRA_COLLAPSED_LENGTH;
  const displayText = !localExpanded && needsTruncation ? extra.slice(0, EXTRA_COLLAPSED_LENGTH) + "..." : extra;

  const handleToggle = () => {
    setLocalExpanded(!localExpanded);
    onToggle();
  };

  return (
    <div style={{ marginBottom: "4px" }}>
      <pre
        style={{
          margin: 0,
          padding: "4px 8px",
          background: "rgba(128,128,128,0.15)",
          borderRadius: "4px",
          fontSize: "0.75rem",
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
        }}
      >
        {displayText}
      </pre>
      {needsTruncation && (
        <Button size="small" onClick={handleToggle} sx={{ fontSize: "0.7rem", p: 0, mt: 0.5 }}>
          {localExpanded ? "Show less" : "Show more"}
        </Button>
      )}
    </div>
  );
}

type SortOrder = "newest" | "oldest";

export default function ToastHistoryList() {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [filter, setFilter] = useState("");
  const [expandAll, setExpandAll] = useState(false);
  const parentRef = useRef<HTMLDivElement>(null);

  const history = getToastHistory();

  const hasAnyExtra = history.some((entry) => !!entry.extra);
  const filtered = filter ? history.filter((entry) => matchesFilter(entry, filter)) : history;
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === "newest" ? b.createdTime - a.createdTime : a.createdTime - b.createdTime,
  );

  const virtualizer = useVirtualizer({
    count: sorted.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
  });

  const remeasure = useCallback(() => {
    // Schedule a remeasure after the DOM updates from expand/collapse
    requestAnimationFrame(() => virtualizer.measure());
  }, [virtualizer]);

  if (history.length === 0) {
    return <div style={{ padding: "16px", textAlign: "center", opacity: 0.6 }}>No notifications yet.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center", flexShrink: 0 }}>
        <TextField
          size="small"
          placeholder="Filter notifications..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ flex: 1 }}
        />
        <Select size="small" value={sortOrder} onChange={(e) => setSortOrder(e.target.value as SortOrder)}>
          <MenuItem value="newest">Newest First</MenuItem>
          <MenuItem value="oldest">Oldest First</MenuItem>
        </Select>
        {hasAnyExtra && (
          <Button size="small" variant="outlined" onClick={() => setExpandAll(!expandAll)}>
            {expandAll ? "Collapse All" : "Expand All"}
          </Button>
        )}
      </div>
      <div ref={parentRef} style={{ flex: 1, overflow: "auto" }}>
        {sorted.length === 0 ? (
          <div style={{ padding: "16px", textAlign: "center", opacity: 0.6 }}>No matching notifications.</div>
        ) : (
          <div
            style={{
              height: virtualizer.getTotalSize(),
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const entry = sorted[virtualRow.index];
              return (
                <div
                  key={`${entry.id}-${entry.createdTime}-${virtualRow.index}`}
                  data-index={virtualRow.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div
                    style={{
                      padding: "8px 12px",
                      borderBottom: "1px solid rgba(128,128,128,0.2)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ marginBottom: "4px" }}>{entry.message}</div>
                    <div style={{ opacity: 0.6, fontSize: "0.75rem" }}>
                      {entry.id && <span>ID: {entry.id} | </span>}
                      Created: {formatTime(entry.createdTime)}
                      {entry.dismissTime && (
                        <span>
                          {" "}
                          | Dismissed: {formatTime(entry.dismissTime)} ({entry.dismissTriggered})
                        </span>
                      )}
                    </div>
                  </div>
                  {entry.extra && <ExtraBlock extra={entry.extra} expanded={expandAll} onToggle={remeasure} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
