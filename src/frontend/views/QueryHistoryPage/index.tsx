import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import HistoryIcon from "@mui/icons-material/History";
import RestoreIcon from "@mui/icons-material/Restore";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Breadcrumbs from "src/frontend/components/Breadcrumbs";
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import DataTable from "src/frontend/components/DataTable";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useGetConnections } from "src/frontend/hooks/useConnection";
import { useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import {
  useClearQueryVersionHistory,
  useDeleteQueryVersionHistory,
  useGetQueryVersionHistory,
} from "src/frontend/hooks/useQueryVersionHistory";
import useToaster from "src/frontend/hooks/useToaster";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";
import { useNavigate } from "src/frontend/utils/commonUtils";
import { SqluiCore } from "typings";

const MAX_SNIPPET_LENGTH = 80;

function QuerySnippet({ sql, expanded }: { sql: string; expanded: boolean }) {
  if (expanded || sql.length <= MAX_SNIPPET_LENGTH) {
    return (
      <Typography
        variant="body2"
        sx={{
          whiteSpace: "pre-wrap",
          fontFamily: "monospace",
          fontSize: "0.8rem",
        }}
      >
        {sql}
      </Typography>
    );
  }
  return (
    <Typography
      variant="body2"
      sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
    >
      {sql.slice(0, MAX_SNIPPET_LENGTH)}...
    </Typography>
  );
}

function useRestoreEntry() {
  const { onAddQuery } = useConnectionQueries();
  const { data: connections } = useGetConnections();
  const navigate = useNavigate();

  return async (entry: SqluiCore.QueryVersionEntry) => {
    const connectionStillExists = connections?.some(
      (c) => c.id === entry.connectionId,
    );
    await onAddQuery({
      connectionId: connectionStillExists ? entry.connectionId : undefined,
      sql: entry.sql,
      name: `Restored ${new Date().toLocaleString()}`,
    });
    navigate("/");
  };
}

function QueryCell({ row }: { row: any }) {
  const entry: SqluiCore.QueryVersionEntry = row.original;
  const [expanded, setExpanded] = useState(false);
  const onRestore = useRestoreEntry();

  return (
    <Box>
      <Link onClick={() => onRestore(entry)} sx={{ cursor: "pointer" }}>
        <QuerySnippet sql={entry.sql} expanded={expanded} />
      </Link>
      {entry.sql.length > MAX_SNIPPET_LENGTH && (
        <Link
          onClick={() => setExpanded(!expanded)}
          sx={{ cursor: "pointer", fontSize: "0.75rem", ml: 1 }}
        >
          {expanded ? "collapse" : "expand"}
        </Link>
      )}
    </Box>
  );
}

function AuditTypeCell({ row }: { row: any }) {
  const entry: SqluiCore.QueryVersionEntry = row.original;
  return (
    <Chip
      label={entry.auditType === "execution" ? "Execution" : "Delta"}
      color={entry.auditType === "execution" ? "warning" : "info"}
      size="small"
    />
  );
}

function ConnectionNameCell({ row }: { row: any }) {
  const entry: SqluiCore.QueryVersionEntry = row.original;
  const { data: connections } = useGetConnections();
  const connection = connections?.find((c) => c.id === entry.connectionId);
  return (
    <Typography
      variant="body2"
      sx={!connection ? { opacity: 0.5, fontStyle: "italic" } : undefined}
    >
      {connection?.name || "N/A (deleted)"}
    </Typography>
  );
}

function DateCell({ row }: { row: any }) {
  const entry: SqluiCore.QueryVersionEntry = row.original;
  return (
    <Typography variant="body2">
      {new Date(entry.createdAt).toLocaleString()}
    </Typography>
  );
}

function ActionCell({ row }: { row: any }) {
  const entry: SqluiCore.QueryVersionEntry = row.original;
  const onRestore = useRestoreEntry();
  const { confirm } = useActionDialogs();
  const { mutateAsync: deleteEntry } = useDeleteQueryVersionHistory();

  const onDelete = async () => {
    try {
      await confirm(`Delete this history entry?`);
      await deleteEntry(entry.id);
    } catch (_err) {}
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="Restore as new query tab">
        <IconButton aria-label="Restore" onClick={() => onRestore(entry)}>
          <RestoreIcon />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete entry">
        <IconButton aria-label="Delete" onClick={onDelete}>
          <DeleteForeverIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

const columns: ColumnDef<any, any>[] = [
  {
    header: "#",
    enableSorting: false,
    enableColumnFilter: false,
    size: 50,
    cell: (info) => (
      <span style={{ fontFamily: "monospace", opacity: 0.5 }}>
        {info.row.index + 1}
      </span>
    ),
  },
  {
    header: "Query",
    accessorKey: "sql",
    cell: (info) => <QueryCell row={info.row} />,
  },
  {
    header: "Type",
    accessorKey: "auditType",
    size: 100,
    cell: (info) => <AuditTypeCell row={info.row} />,
  },
  {
    header: "Connection",
    accessorKey: "connectionId",
    size: 150,
    cell: (info) => <ConnectionNameCell row={info.row} />,
  },
  {
    header: "Date",
    accessorKey: "createdAt",
    size: 180,
    cell: (info) => <DateCell row={info.row} />,
  },
  {
    header: "",
    id: "action",
    size: 80,
    cell: (info) => <ActionCell row={info.row} />,
  },
];

function QueryHistoryList() {
  const { data, isLoading } = useGetQueryVersionHistory();
  const { mutateAsync: clearHistory } = useClearQueryVersionHistory();
  const { confirm } = useActionDialogs();
  const { add: addToast } = useToaster();

  const entries = useMemo(() => {
    const items = data || [];
    return [...items].sort((a, b) => b.createdAt - a.createdAt);
  }, [data]);

  const onClearHistory = async () => {
    try {
      await confirm(`Clear all query version history? This cannot be undone.`);
      await clearHistory();
      await addToast({ message: "Query version history cleared." });
    } catch (_err) {}
  };

  if (isLoading) {
    return (
      <Backdrop
        open={true}
        sx={{
          bgcolor: "background.paper",
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading...
        </Typography>
      </Backdrop>
    );
  }

  if (entries.length === 0) {
    return <Typography>No query history yet...</Typography>;
  }

  return (
    <>
      <Box>
        <Link onClick={onClearHistory} sx={{ cursor: "pointer" }}>
          Clear History
        </Link>
      </Box>
      <DataTable data={entries} columns={columns} />
    </>
  );
}

/**
 * Page displaying query version history with restore and delete actions.
 */
export default function QueryHistoryPage() {
  useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className="Page Page__QueryHistory">
      <>
        <NewConnectionButton />
        <VirtualizedConnectionTree />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <HistoryIcon fontSize="inherit" />
                  Query History
                </>
              ),
            },
          ]}
        />
        <Box className="FormInput__Container">
          <QueryHistoryList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
