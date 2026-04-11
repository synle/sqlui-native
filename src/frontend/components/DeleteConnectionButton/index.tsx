import DeleteIcon from "@mui/icons-material/Delete";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import React from "react";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useDeleteConnection } from "src/frontend/hooks/useConnection";

/** Props for the DeleteConnectionButton component. */
type DeleteConnectionButtonProps = {
  /** The ID of the connection to delete. */
  connectionId: string;
};

/**
 * An icon button that deletes a database connection after user confirmation.
 * @param props - Contains the connectionId to delete.
 * @returns A delete icon button with tooltip.
 */
export default function DeleteConnectionButton(props: DeleteConnectionButtonProps): React.JSX.Element | null {
  const { connectionId } = props;
  const { confirm } = useActionDialogs();
  const { mutateAsync } = useDeleteConnection();
  const onDelete = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await confirm("Delete this connection?");
      await mutateAsync(connectionId);
    } catch (err) {
      console.error("index.tsx:mutateAsync", err);
    }
  };

  return (
    <Tooltip title="Delete Connection">
      <IconButton aria-label="Delete Connection" onClick={onDelete} size="small">
        <DeleteIcon fontSize="inherit" />
      </IconButton>
    </Tooltip>
  );
}
