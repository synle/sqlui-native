import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { getToastHistory, ToastHistoryEntry } from "src/frontend/hooks/useToaster";

const EXTRA_COLLAPSED_LENGTH = 100;

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

function ExtraBlock({ extra, expanded }: { extra: string; expanded: boolean }) {
  const [localExpanded, setLocalExpanded] = useState(expanded);
  const needsTruncation = extra.length > EXTRA_COLLAPSED_LENGTH;
  const displayText = !localExpanded && needsTruncation ? extra.slice(0, EXTRA_COLLAPSED_LENGTH) + "..." : extra;

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
        <Button size="small" onClick={() => setLocalExpanded(!localExpanded)} sx={{ fontSize: "0.7rem", p: 0, mt: 0.5 }}>
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

  const history = getToastHistory();

  if (history.length === 0) {
    return <div style={{ padding: "16px", textAlign: "center", opacity: 0.6 }}>No notifications yet.</div>;
  }

  const hasAnyExtra = history.some((entry) => !!entry.extra);
  const filtered = filter ? history.filter((entry) => matchesFilter(entry, filter)) : history;
  const sorted = [...filtered].sort((a, b) =>
    sortOrder === "newest" ? b.createdTime - a.createdTime : a.createdTime - b.createdTime,
  );

  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
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
      <div style={{ maxHeight: "400px", overflow: "auto" }}>
        {sorted.map((entry: ToastHistoryEntry, idx: number) => (
          <div
            key={`${entry.id}-${entry.createdTime}-${idx}`}
            style={{
              padding: "8px 12px",
              borderBottom: "1px solid rgba(128,128,128,0.2)",
              fontSize: "0.85rem",
            }}
          >
            {entry.extra && <ExtraBlock extra={entry.extra} expanded={expandAll} />}
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
        ))}
        {sorted.length === 0 && (
          <div style={{ padding: "16px", textAlign: "center", opacity: 0.6 }}>No matching notifications.</div>
        )}
      </div>
    </div>
  );
}
