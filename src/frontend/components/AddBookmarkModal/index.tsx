import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import TextField from "@mui/material/TextField";
import { useState } from "react";
import { useAddBookmarkItem } from "src/frontend/hooks/useFolderItems";
import useToaster from "src/frontend/hooks/useToaster";
import { SqluiCore, SqluiFrontend } from "typings";

/** Props for the AddBookmarkModalContent component. */
type AddBookmarkQueryProps = {
  /** The query to bookmark. */
  query: SqluiFrontend.ConnectionQuery;
  /** Callback invoked after the bookmark is saved or cancelled. */
  onDone: () => void;
};

/** Props for the AddBookmarkConnectionContent component. */
type AddBookmarkConnectionProps = {
  /** The connection to bookmark. */
  connection: SqluiCore.ConnectionProps;
  /** Callback invoked after the bookmark is saved or cancelled. */
  onDone: () => void;
};

/**
 * Modal content for bookmarking a query with options to keep connection association and include result snapshot.
 * @param props - The query data and completion callback.
 * @returns Form with bookmark name, association toggle, and result snapshot toggle.
 */
export function AddBookmarkQueryContent({ query, onDone }: AddBookmarkQueryProps): JSX.Element {
  const { mutateAsync: addBookmarkItem } = useAddBookmarkItem();
  const { add: addToast } = useToaster();

  const defaultName = `${query.name || ""} - ${new Date().toLocaleString()}`;
  const [name, setName] = useState(defaultName);
  const [keepAssociation, setKeepAssociation] = useState(true);
  const [includeResult, setIncludeResult] = useState(false);

  const hasResult = !!(query as any).result;
  const hasAssociation = !!(query.connectionId || query.databaseId || query.tableId);

  const onSave = async () => {
    if (!name.trim()) return;

    const queryData: Record<string, any> = { ...query };

    if (!keepAssociation) {
      delete queryData.connectionId;
      delete queryData.databaseId;
      delete queryData.tableId;
    }

    if (!includeResult) {
      delete queryData.result;
      delete queryData.executionStart;
      delete queryData.executionEnd;
    }

    await addBookmarkItem({
      type: "Query",
      name: name.trim(),
      data: queryData as SqluiCore.ConnectionQuery,
    });

    await addToast({ message: `Bookmark "${name.trim()}" saved.` });
    onDone();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 400 }}>
      <TextField
        placeholder="Enter a bookmark name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        autoFocus
      />
      <Box>
        <FormControlLabel
          control={<Checkbox checked={keepAssociation} onChange={(e) => setKeepAssociation(e.target.checked)} disabled={!hasAssociation} />}
          label="Keep connection association"
        />
        <FormHelperText sx={{ mt: -0.5, ml: 4 }}>
          {hasAssociation
            ? "Save the linked connection, database, and table so the query can be restored with its original context."
            : "This query is not linked to any connection."}
        </FormHelperText>
      </Box>
      <Box>
        <FormControlLabel
          control={<Checkbox checked={includeResult} onChange={(e) => setIncludeResult(e.target.checked)} disabled={!hasResult} />}
          label="Include result snapshot"
        />
        <FormHelperText sx={{ mt: -0.5, ml: 4 }}>
          {hasResult
            ? "Save the current query result so it can be viewed later without re-executing."
            : "No result available — execute the query first to enable this option."}
        </FormHelperText>
      </Box>
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="outlined" size="small" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="contained" size="small" onClick={onSave} disabled={!name.trim()}>
          Save
        </Button>
      </Box>
    </Box>
  );
}

/**
 * Modal content for bookmarking a connection with a name input.
 * @param props - The connection data and completion callback.
 * @returns Form with bookmark name input.
 */
export function AddBookmarkConnectionContent({ connection, onDone }: AddBookmarkConnectionProps): JSX.Element {
  const { mutateAsync: addBookmarkItem } = useAddBookmarkItem();
  const { add: addToast } = useToaster();

  const defaultName = `${connection.name || ""} - ${new Date().toLocaleString()}`;
  const [name, setName] = useState(defaultName);

  const onSave = async () => {
    if (!name.trim()) return;

    await addBookmarkItem({
      type: "Connection",
      name: name.trim(),
      data: connection,
    });

    await addToast({ message: `Bookmark "${name.trim()}" saved.` });
    onDone();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, minWidth: 400 }}>
      <TextField
        placeholder="Enter a bookmark name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        fullWidth
        autoFocus
      />
      <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
        <Button variant="outlined" size="small" onClick={onDone}>
          Cancel
        </Button>
        <Button variant="contained" size="small" onClick={onSave} disabled={!name.trim()}>
          Save
        </Button>
      </Box>
    </Box>
  );
}
