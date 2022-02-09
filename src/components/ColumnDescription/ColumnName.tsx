import Tooltip from '@mui/material/Tooltip';
import {styled} from '@mui/system';
const StyledColumnName = styled('span')(({ theme }) => {
  return {
    maxWidth: '50%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
});

export default function ColumnName(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnName>{props.value}</StyledColumnName>
    </Tooltip>
  );
}