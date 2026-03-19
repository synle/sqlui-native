import Typography from "@mui/material/Typography";
import { useState } from "react";

/**
 * A date display cell that shows a short date by default and expands to include time on click.
 * @param props - The component props.
 * @param props.timestamp - The Unix timestamp in milliseconds to display.
 * @returns The rendered date cell, or null if no timestamp is provided.
 */
export default function DateCell({ timestamp }: { timestamp?: number }) {
  const [expanded, setExpanded] = useState(false);

  if (!timestamp) return null;

  const date = new Date(timestamp);
  const label = expanded ? date.toLocaleString() : date.toLocaleDateString();

  return (
    <Typography variant="body2" onClick={() => setExpanded(!expanded)} sx={{ cursor: "pointer", whiteSpace: "nowrap" }}>
      {label}
    </Typography>
  );
}
