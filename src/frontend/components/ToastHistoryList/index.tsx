import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getToastHistory, ToastHistoryEntry } from "src/frontend/hooks/useToaster";

const COLLAPSED_LENGTH = 250;
const ESTIMATED_ROW_HEIGHT = 60;

function formatTime(ts?: number) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function stringifyMetadata(metadata: any): string | undefined {
  if (metadata === null || metadata === undefined) return undefined;
  try {
    return JSON.stringify(metadata, null, 2);
  } catch {
    return String(metadata);
  }
}

function getExpandableContent(entry: ToastHistoryEntry): { label: string; content: string }[] {
  const sections: { label: string; content: string }[] = [];
  if (entry.detail) {
    sections.push({ label: "Detail", content: entry.detail });
  }
  if (entry.metadata) {
    const metaStr = stringifyMetadata(entry.metadata);
    if (metaStr) {
      sections.push({ label: "Metadata", content: metaStr });
    }
  }
  return sections;
}

function needsTruncation(sections: { label: string; content: string }[]): boolean {
  const totalLength = sections.reduce((sum, s) => sum + s.content.length, 0);
  return totalLength > COLLAPSED_LENGTH;
}

function matchesFilter(entry: ToastHistoryEntry, filter: string): boolean {
  const lower = filter.toLowerCase();
  if (entry.id?.toLowerCase().includes(lower)) return true;
  if (typeof entry.message === "string" && entry.message.toLowerCase().includes(lower)) return true;
  if (entry.detail && entry.detail.toLowerCase().includes(lower)) return true;
  if (entry.metadata) {
    const metaStr = stringifyMetadata(entry.metadata);
    if (metaStr && metaStr.toLowerCase().includes(lower)) return true;
  }
  return false;
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: "4px 8px",
  background: "rgba(128,128,128,0.15)",
  borderRadius: "4px",
  fontSize: "0.75rem",
  fontFamily: "monospace",
  whiteSpace: "pre-wrap",
  wordBreak: "break-all",
};

function ExpandableContent({
  sections,
  expanded,
  onToggle,
}: {
  sections: { label: string; content: string }[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const [localExpanded, setLocalExpanded] = useState(expanded);

  useEffect(() => {
    setLocalExpanded(expanded);
  }, [expanded]);

  const truncatable = needsTruncation(sections);
  const showFull = localExpanded || !truncatable;

  const handleToggle = () => {
    setLocalExpanded(!localExpanded);
    onToggle();
  };

  const detailSection = sections.find((s) => s.label === "Detail");
  const metadataSection = sections.find((s) => s.label === "Metadata");

  return (
    <div style={{ padding: "4px 12px 0" }}>
      {showFull ? (
        <div style={{ display: "flex", gap: "8px" }}>
          {detailSection && (
            <div style={{ flex: metadataSection ? "0 0 50%" : "1 1 100%", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <span style={{ opacity: 0.6, fontSize: "0.7rem" }}>{detailSection.label}</span>
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard.writeText(detailSection.content)}
                  sx={{ padding: "1px", opacity: 0.5, "&:hover": { opacity: 1 } }}
                >
                  <ContentCopyIcon sx={{ fontSize: "0.7rem" }} />
                </IconButton>
              </div>
              <pre style={preStyle}>{detailSection.content}</pre>
            </div>
          )}
          {metadataSection && (
            <div style={{ flex: detailSection ? "0 0 50%" : "1 1 100%", minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                <span style={{ opacity: 0.6, fontSize: "0.7rem" }}>{metadataSection.label}</span>
                <IconButton
                  size="small"
                  onClick={() => navigator.clipboard.writeText(metadataSection.content)}
                  sx={{ padding: "1px", opacity: 0.5, "&:hover": { opacity: 1 } }}
                >
                  <ContentCopyIcon sx={{ fontSize: "0.7rem" }} />
                </IconButton>
              </div>
              <pre style={preStyle}>{metadataSection.content}</pre>
            </div>
          )}
        </div>
      ) : (
        <pre style={preStyle}>
          {sections.map((s) => s.content).join("\n").slice(0, COLLAPSED_LENGTH) + "..."}
        </pre>
      )}
      {truncatable && (
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

  const hasAnyExpandable = history.some((entry) => getExpandableContent(entry).length > 0);
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
        {hasAnyExpandable && (
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
              const sections = getExpandableContent(entry);
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
                  {sections.length > 0 && (
                    <ExpandableContent sections={sections} expanded={expandAll} onToggle={remeasure} />
                  )}
                  <Divider sx={{ mt: 1 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
