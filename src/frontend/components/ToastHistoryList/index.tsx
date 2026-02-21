import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { getToastHistory, ToastHistoryEntry } from "src/frontend/hooks/useToaster";

function formatTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function formatExtra(extra?: string | Record<string, unknown>): string {
  if (extra === undefined || extra === null) return "";
  if (typeof extra === "string") return extra;
  return JSON.stringify(extra);
}

function matchesFilter(entry: ToastHistoryEntry, filter: string): boolean {
  const lower = filter.toLowerCase();
  if (entry.id?.toLowerCase().includes(lower)) return true;
  if (typeof entry.message === "string" && entry.message.toLowerCase().includes(lower)) return true;
  if (entry.extra !== undefined) {
    const extraStr = typeof entry.extra === "string" ? entry.extra : JSON.stringify(entry.extra);
    if (extraStr.toLowerCase().includes(lower)) return true;
  }
  return false;
}

type SortOrder = "newest" | "oldest";

export default function ToastHistoryList() {
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [filter, setFilter] = useState("");

  const history = getToastHistory();

  if (history.length === 0) {
    return <div style={{ padding: "16px", textAlign: "center", opacity: 0.6 }}>No notifications yet.</div>;
  }

  let filtered = filter ? history.filter((entry) => matchesFilter(entry, filter)) : history;
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
      </div>
      <div style={{ maxHeight: "400px", overflow: "auto" }}>
        {sorted.map((entry: ToastHistoryEntry, idx: number) => {
          const extraStr = formatExtra(entry.extra);
          return (
            <div
              key={`${entry.id}-${entry.createdTime}-${idx}`}
              style={{
                padding: "8px 12px",
                borderBottom: "1px solid rgba(128,128,128,0.2)",
                fontSize: "0.85rem",
              }}
            >
              {extraStr && (
                <div style={{ marginBottom: "4px", opacity: 0.8, fontFamily: "monospace", fontSize: "0.75rem" }}>
                  {extraStr}
                </div>
              )}
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
          );
        })}
        {sorted.length === 0 && (
          <div style={{ padding: "16px", textAlign: "center", opacity: 0.6 }}>No matching notifications.</div>
        )}
      </div>
    </div>
  );
}
