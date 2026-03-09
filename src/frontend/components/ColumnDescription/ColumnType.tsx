import Tooltip from "@mui/material/Tooltip";
import { styled } from "@mui/system";

const StyledColumnType = styled("i")(({ theme }) => {
  return {
    color: theme.palette.text.disabled,
    fontFamily: "monospace",
    paddingRight: theme.spacing(1),
    maxWidth: "50%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "right",
    textTransform: "capitalize",
    marginLeft: "auto",
  };
});

/**
 * Displays a column data type in italicized monospace with a tooltip showing the full type.
 * @param props - Props containing the column type value.
 * @returns The rendered column type element.
 */
export default function ColumnType(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnType>{props.value?.toLowerCase()}</StyledColumnType>
    </Tooltip>
  );
}
