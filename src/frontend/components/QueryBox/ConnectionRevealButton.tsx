import React from "react";
import PreviewIcon from "@mui/icons-material/Preview";
import { Button } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import { useCommands } from "src/frontend/components/MissionControl";
import { SqluiFrontend } from "typings";

/** Props for the ConnectionRevealButton component. */
type ConnectionRevealButtonProps = {
  /** The query whose connection should be revealed in the tree. */
  query: SqluiFrontend.ConnectionQuery;
};

/**
 * Button that reveals the current query's connection in the connection tree sidebar.
 * @param props - Contains the query to reveal.
 * @returns The reveal button or null if no query is provided.
 */
export default function ConnectionRevealButton(props: ConnectionRevealButtonProps): React.JSX.Element | null {
  const { query } = props;
  const { selectCommand } = useCommands();

  if (!query) {
    return null;
  }

  const disabled = !query.connectionId && !query.databaseId;

  return (
    <Tooltip title="Reveal this Connection on the connection tree.">
      <span>
        <Button
          type="button"
          variant="outlined"
          startIcon={<PreviewIcon />}
          onClick={() => selectCommand({ event: "clientEvent/query/reveal" })}
          disabled={disabled}
        >
          Reveal
        </Button>
      </span>
    </Tooltip>
  );
}
