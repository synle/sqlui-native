import React from "react";
import CloudIcon from "@mui/icons-material/Cloud";
import { getDialectIcon, SUPPORTED_DIALECTS } from "src/common/adapters/DataScriptFactory";
import { useLayoutModeSetting } from "src/frontend/hooks/useSetting";

/** Props for the ConnectionTypeIcon component. */
type ConnectionTypeIconProps = {
  /** The database dialect (e.g., mysql, postgres, mongodb). */
  dialect?: string;
  /** The connection status (e.g., "online" or "offline"). */
  status?: string;
};

/**
 * Renders an icon representing the database connection type.
 * Shows a dialect-specific icon when online, or a disabled cloud icon when offline.
 * @param props - The dialect and status of the connection.
 * @returns An icon element or null.
 */
export default function ConnectionTypeIcon(props: ConnectionTypeIconProps): React.JSX.Element | null {
  const { dialect, status } = props;
  const isCompact = useLayoutModeSetting() === "compact";

  const iconSize = isCompact ? "20px" : "25px";
  const iconStyle = { width: iconSize, height: iconSize };

  if (status !== "online") {
    return <CloudIcon color="disabled" sx={iconStyle} />;
  }

  if (dialect && SUPPORTED_DIALECTS.indexOf(dialect) >= 0) {
    return <img src={getDialectIcon(dialect)} alt={dialect} title={dialect} style={iconStyle} />;
  }

  return <CloudIcon color="primary" sx={iconStyle} />;
}
