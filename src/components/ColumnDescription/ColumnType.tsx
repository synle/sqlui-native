import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/system';
const StyledColumnType = styled('i')(({ theme }) => {
  return {
    color: theme.palette.text.disabled,
    fontFamily: 'monospace',
    paddingRight: theme.spacing(1),
    maxWidth: '50%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginLeft: 'auto',
  };
});

export default function ColumnType(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnType>{props.value}</StyledColumnType>
    </Tooltip>
  );
}
