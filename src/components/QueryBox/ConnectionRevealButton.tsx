import PreviewIcon from '@mui/icons-material/Preview';
import { Button } from '@mui/material';
import Tooltip from '@mui/material/Tooltip';
import { SqluiFrontend } from 'typings';
import { useCommands } from 'src/components/MissionControl';
interface ConnectionRevealButtonProps {
  query: SqluiFrontend.ConnectionQuery;
}

export default function ConnectionRevealButton(props: ConnectionRevealButtonProps) {
  const { query } = props;
  const { selectCommand } = useCommands();

  if (!query) {
    return null;
  }

  const disabled = !query.connectionId && !query.databaseId;

  return (
    <Tooltip title='Reveal this Connection on the connection tree.'>
      <span>
        <Button
          type='button'
          variant='outlined'
          startIcon={<PreviewIcon />}
          onClick={() => selectCommand({ event: 'clientEvent/query/reveal' })}
          sx={{ ml: 3 }}
          disabled={disabled}>
          Reveal
        </Button>
      </span>
    </Tooltip>
  );
}
