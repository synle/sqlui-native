import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/system";

const StyledColumnName = styled("span")(() => {
  return {
    maxWidth: "50%",
    overflow: "hidden",
    textOverflow: "ellipsis",
  };
});

/**
 * Displays a column name with text overflow ellipsis and a tooltip showing the full name.
 * @param props - Props containing the column name value.
 * @returns The rendered column name element.
 */
export default function ColumnName(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnName>{props.value}</StyledColumnName>
    </Tooltip>
  );
}
