import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
import HistoryIcon from "@mui/icons-material/History";
import RestoreIcon from "@mui/icons-material/Restore";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { useEffect, useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Breadcrumbs from "src/frontend/components/Breadcrumbs";
import DateCell from "src/frontend/components/DateCell";
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

/**
 * Table cell that renders the SQL query text with expand/collapse toggle.
 * @param row - The TanStack table row containing a FolderItem.
 * @param allExpanded - Whether all rows should be expanded globally.
 */
function QueryDetailCell({ row, allExpanded }: { row: any; allExpanded: boolean }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  const [localExpanded, setLocalExpanded] = useState<boolean | null>(null);
  const expanded = localExpanded ?? allExpanded;

  if (folderItem.type !== "execution" && folderItem.type !== "delta") return null;
  const sql = folderItem.data.sql || "";
  if (!sql) return null;

  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.5 }}>
      <IconButton size="small" onClick={() => setLocalExpanded(!expanded)} sx={{ p: 0, minWidth: 0 }}>
        {expanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
      </IconButton>
      <Typography
        variant="body2"
        sx={{
          fontFamily: "monospace",
          fontSize: "0.8rem",
          whiteSpace: expanded ? "pre-wrap" : "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          flex: 1,
          minWidth: 0,
        }}
      >
        {expanded ? sql : sql.replace(/\s+/g, " ")}
      </Typography>
    </Box>
  );
}

/**
 * Hook that returns an async function to restore a query history entry as a new query tab.
 * @returns An async handler that adds the restored query and navigates to the main page.
 */
function useRestoreEntry() {
  const { onAddQuery } = useConnectionQueries();
  const { data: connections } = useGetConnections();
  const navigate = useNavigate();

  return async (folderItem: SqluiCore.FolderItem) => {
    if (folderItem.type !== "execution" && folderItem.type !== "delta") return;
    const connectionId = folderItem.data.connectionId;
    const connectionStillExists = connections?.some((c) => c.id === connectionId);
    await onAddQuery({
      connectionId: connectionStillExists ? connectionId : undefined,
      sql: folderItem.data.sql,
      name: `Restored ${new Date().toLocaleString()}`,
    });
    navigate("/");
  };
}

/**
 * Table cell showing a truncated SQL label that restores the entry when clicked.
 * @param row - The TanStack table row containing a FolderItem.
 */
function NameCell({ row }: { row: any }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  const onRestore = useRestoreEntry();

  if (folderItem.type !== "execution" && folderItem.type !== "delta") return null;
  const sql = folderItem.data.sql || "";
  const label = sql.length > 60 ? sql.slice(0, 60) + "..." : sql;

  return (
    <Link onClick={() => onRestore(folderItem)} underline="none" sx={{ cursor: "pointer" }}>
      {label}
    </Link>
  );
}

/**
 * Table cell that renders a color-coded chip for the audit entry type (Execution or Delta).
 * @param row - The TanStack table row containing a FolderItem.
 */
function AuditTypeCell({ row }: { row: any }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  return (
    <Chip
      label={folderItem.type === "execution" ? "Execution" : "Delta"}
      color={folderItem.type === "execution" ? "warning" : "info"}
      size="small"
    />
  );
}

/**
 * Table cell displaying the connection name associated with a history entry, or "N/A (deleted)" if gone.
 * @param row - The TanStack table row containing a FolderItem.
 */
function ConnectionNameCell({ row }: { row: any }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  const { data: connections } = useGetConnections();
  const connectionId = folderItem.type === "execution" || folderItem.type === "delta" ? folderItem.data.connectionId : undefined;
  const connection = connections?.find((c) => c.id === connectionId);
  return (
    <Typography variant="body2" sx={!connection ? { opacity: 0.5, fontStyle: "italic" } : undefined}>
      {connection?.name || folderItem.name || "N/A (deleted)"}
    </Typography>
  );
}

/**
 * Table cell with restore and delete action buttons for a query history entry.
 * @param row - The TanStack table row containing a FolderItem.
 */
function ActionCell({ row }: { row: any }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  const onRestore = useRestoreEntry();
  const { confirm } = useActionDialogs();
  const { mutateAsync: deleteEntry } = useDeleteQueryVersionHistory();

  const onDelete = async () => {
    try {
      await confirm(`Delete this history entry?`);
      await deleteEntry(folderItem.id);
    } catch (_err) {}
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <Tooltip title="Restore as new query tab">
        <IconButton aria-label="Restore" onClick={() => onRestore(folderItem)}>
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

/**
 * Returns the column definitions for the query history table.
 * @param allExpanded - Whether all detail rows should be rendered in expanded state.
 * @returns Array of TanStack table column definitions.
 */
const getColumns = (allExpanded: boolean): ColumnDef<any, any>[] => [
  {
    header: "#",
    enableSorting: false,
    enableColumnFilter: false,
    size: 50,
    cell: (info) => <span style={{ fontFamily: "monospace", opacity: 0.5 }}>{info.row.index + 1}</span>,
  },
  {
    header: "Query",
    accessorKey: "name",
    size: 250,
    cell: (info) => <NameCell row={info.row} />,
  },
  {
    header: "Details",
    id: "details",
    cell: (info) => <QueryDetailCell row={info.row} allExpanded={allExpanded} />,
  },
  {
    header: "Type",
    accessorKey: "type",
    size: 100,
    cell: (info) => <AuditTypeCell row={info.row} />,
  },
  {
    header: "Connection",
    id: "connection",
    size: 150,
    cell: (info) => <ConnectionNameCell row={info.row} />,
  },
  {
    header: "Created",
    accessorKey: "createdAt",
    size: 120,
    cell: (info) => <DateCell timestamp={info.row.original.createdAt} />,
  },
  {
    header: "",
    id: "action",
    size: 80,
    cell: (info) => <ActionCell row={info.row} />,
  },
];

/**
 * Sortable table listing all query version history entries with clear, restore, and delete actions.
 */
function QueryHistoryList() {
  const { data, isLoading } = useGetQueryVersionHistory();
  const { mutateAsync: clearHistory } = useClearQueryVersionHistory();
  const { confirm } = useActionDialogs();
  const { add: addToast } = useToaster();
  const [allExpanded, setAllExpanded] = useState(false);

  const entries = useMemo(() => {
    const items = data || [];
    return [...items].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
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

  const columns = getColumns(allExpanded);

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button variant="outlined" color="error" size="small" startIcon={<DeleteSweepIcon />} onClick={onClearHistory}>
          Clear History
        </Button>
        <Tooltip title={allExpanded ? "Collapse all details" : "Expand all details"}>
          <IconButton size="small" onClick={() => setAllExpanded(!allExpanded)}>
            {allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
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
