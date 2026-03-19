import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import DeleteSweepIcon from "@mui/icons-material/DeleteSweep";
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
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import DataTable from "src/frontend/components/DataTable";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useDeletedRecycleBinItem, useGetRecycleBinItems, useRestoreRecycleBinItem } from "src/frontend/hooks/useFolderItems";
import useToaster from "src/frontend/hooks/useToaster";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";
import { SqluiCore } from "typings";

function NameCell({ row }: { row: any }) {
  const folderItem = row.original;
  const { mutateAsync: restoreRecycleBinItem } = useRestoreRecycleBinItem();
  return <Link onClick={() => restoreRecycleBinItem(folderItem)}>{folderItem.name}</Link>;
}

function QueryDetailCell({ row, allExpanded }: { row: any; allExpanded: boolean }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  const [localExpanded, setLocalExpanded] = useState<boolean | null>(null);
  const expanded = localExpanded ?? allExpanded;

  if (folderItem.type === "Query") {
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
  if (folderItem.type === "Session") {
    const count = folderItem.connections?.length ?? 0;
    return (
      <Typography variant="body2">
        {count} connection{count !== 1 ? "s" : ""}
      </Typography>
    );
  }
  return null;
}

function DeletedAtCell({ row }: { row: any }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  if (!folderItem.deletedAt) {
    return null;
  }
  return <Typography variant="body2">{new Date(folderItem.deletedAt).toLocaleString()}</Typography>;
}

function TypeCell({ row }: { row: any }) {
  const folderItem = row.original;
  const colorMap: Record<string, "success" | "warning" | "info"> = {
    Connection: "success",
    Query: "warning",
    Session: "info",
  };
  return <Chip label={folderItem.type} color={colorMap[folderItem.type] ?? "default"} size="small" />;
}

function ActionCell({ row }: { row: any }) {
  const folderItem = row.original;
  const { confirm } = useActionDialogs();
  const { mutateAsync: restoreRecycleBinItem } = useRestoreRecycleBinItem();
  const { mutateAsync: deleteRecyleBinItem } = useDeletedRecycleBinItem();

  const onRestoreRecycleBinItem = restoreRecycleBinItem;

  const onDeleteRecycleBin = async (folderItem: SqluiCore.FolderItem) => {
    try {
      await confirm(`Do you want to delete this item permanently "${folderItem.name}"?`);
      await deleteRecyleBinItem(folderItem.id);
    } catch (err) {
      console.error("index.tsx:deleteRecyleBinItem", err);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <IconButton aria-label="Restore item" onClick={() => onRestoreRecycleBinItem(folderItem)}>
        <RestoreIcon />
      </IconButton>
      <IconButton aria-label="Delete item permanently" onClick={() => onDeleteRecycleBin(folderItem)}>
        <DeleteForeverIcon />
      </IconButton>
    </Box>
  );
}

const getColumns = (allExpanded: boolean): ColumnDef<any, any>[] => [
  {
    header: "#",
    enableSorting: false,
    enableColumnFilter: false,
    size: 50,
    cell: (info) => <span style={{ fontFamily: "monospace", opacity: 0.5 }}>{info.row.index + 1}</span>,
  },
  {
    header: "Name",
    accessorKey: "name",
    size: 250,
    cell: (info) => <NameCell row={info.row} />,
  },
  {
    header: "Details",
    accessorKey: "connections",
    cell: (info) => <QueryDetailCell row={info.row} allExpanded={allExpanded} />,
  },
  {
    header: "Type",
    accessorKey: "type",
    size: 100,
    cell: (info) => <TypeCell row={info.row} />,
  },
  {
    header: "Deleted",
    accessorKey: "deletedAt",
    size: 180,
    cell: (info) => <DeletedAtCell row={info.row} />,
  },
  {
    header: "",
    accessorKey: "id",
    size: 80,
    cell: (info) => <ActionCell row={info.row} />,
  },
];

function RecycleBinItemList() {
  const { data, isLoading: loadingRecycleBinItems } = useGetRecycleBinItems();
  const { mutateAsync: deleteRecyleBinItem } = useDeletedRecycleBinItem();
  const { confirm } = useActionDialogs();
  const { add: addToast } = useToaster();
  const isLoading = loadingRecycleBinItems;
  const [allExpanded, setAllExpanded] = useState(false);

  const folderItems = useMemo(() => {
    const items = data || [];
    return [...items].sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0));
  }, [data]);

  const hasQueryItems = folderItems.some((item) => item.type === "Query" && item.data?.sql);

  const onEmptyTrash = async () => {
    try {
      await confirm(`Do you want to empty the recycle bin? This action cannot be undone.`);
      await Promise.all(folderItems.map((folderItem) => deleteRecyleBinItem(folderItem.id)));
      await addToast({
        message: `Recycle Bin emptied.`,
      });
    } catch (err) {
      console.error("index.tsx:addToast", err);
    }
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

  if (folderItems.length === 0) {
    return <Typography>Recycle Bin is empty...</Typography>;
  }

  const columns = getColumns(allExpanded);

  return (
    <>
      <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
        <Button variant="outlined" color="error" size="small" startIcon={<DeleteSweepIcon />} onClick={() => onEmptyTrash()}>
          Empty Trash
        </Button>
        {hasQueryItems && (
          <Tooltip title={allExpanded ? "Collapse all details" : "Expand all details"}>
            <IconButton size="small" onClick={() => setAllExpanded(!allExpanded)}>
              {allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>
      <DataTable data={folderItems} columns={columns} />
    </>
  );
}
/**
 * Page displaying soft-deleted items (connections, queries, sessions) with restore and permanent delete options.
 */
export default function RecycleBinPage() {
  useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className="Page Page__RecycleBin">
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
                  <DeleteIcon fontSize="inherit" />
                  Recycle Bin
                </>
              ),
            },
          ]}
        />
        <Box className="FormInput__Container">
          <RecycleBinItemList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
