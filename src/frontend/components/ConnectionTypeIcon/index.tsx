import CloudIcon from "@mui/icons-material/Cloud";
import { getDialectIcon, SUPPORTED_DIALECTS } from "src/common/adapters/DataScriptFactory";
import { useLayoutModeSetting, useIsAnimationModeOn } from "src/frontend/hooks/useSetting";

type ConnectionTypeIconProps = {
  dialect?: string;
  status?: string;
};

export default function ConnectionTypeIcon(props: ConnectionTypeIconProps): JSX.Element | null {
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
