import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
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
import { Link as RouterLink } from "react-router-dom";
import { useState } from "react";
import { useNavigate } from "src/frontend/utils/commonUtils";
import { ColumnDef } from "@tanstack/react-table";
import DataTable from "src/frontend/components/DataTable";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useUpsertConnection } from "src/frontend/hooks/useConnection";
import { useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import { useDeleteBookmarkItem, useGetBookmarkItems, useUpdateBookmarkItem } from "src/frontend/hooks/useFolderItems";
import { SqluiCore } from "typings";

/** Callback invoked after a bookmark item is selected and applied. */
type OnAfterSelectCallback = () => void;

/**
 * Table cell that renders a bookmark name as a clickable link to open the connection or query.
 * @param props - Contains the table row and optional after-select callback.
 * @returns A link element that opens the bookmark item.
 */
function NameCell({ row, onAfterSelect }: { row: any; onAfterSelect?: OnAfterSelectCallback }) {
  const folderItem = row.original;
  const { onAddQuery } = useConnectionQueries();
  const navigate = useNavigate();
  const { mutateAsync: upsertConnection } = useUpsertConnection();
  const onOpenBookmarkItem = async (folderItem: SqluiCore.FolderItem) => {
    switch (folderItem.type) {
      case "Connection":
        await upsertConnection(folderItem.data);
        navigate("/");
        onAfterSelect && onAfterSelect();
        break;
      case "Query":
        await onAddQuery(folderItem.data);
        navigate("/");
        onAfterSelect && onAfterSelect();
        break;
    }
  };

  return <Link onClick={() => onOpenBookmarkItem(folderItem)}>{folderItem.name}</Link>;
}

/**
 * Table cell that renders a colored chip indicating the bookmark type (Connection or Query).
 * @param props - Contains the table row with the bookmark item.
 * @returns A MUI Chip with the bookmark type label.
 */
function TypeCell({ row }: { row: any }) {
  const folderItem = row.original;
  return <Chip label={folderItem.type} color={folderItem.type === "Connection" ? "success" : "warning"} size="small" />;
}

/**
 * Table cell that renders the SQL of a Query bookmark with expand/collapse toggle.
 * @param props - Contains the table row and global allExpanded state.
 * @returns The SQL preview element, or null for non-Query bookmarks.
 */
function QueryDetailCell({ row, allExpanded }: { row: any; allExpanded: boolean }) {
  const folderItem: SqluiCore.FolderItem = row.original;
  const [localExpanded, setLocalExpanded] = useState<boolean | null>(null);
  const expanded = localExpanded ?? allExpanded;

  if (folderItem.type !== "Query") return null;
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
 * Table cell with edit and delete action buttons for a bookmark item.
 * @param props - Contains the table row with the bookmark item.
 * @returns A box with icon buttons for editing and deleting the bookmark.
 */
function ActionCell({ row }: { row: any }) {
  const folderItem = row.original;
  const { confirm, prompt } = useActionDialogs();
  const { mutateAsync: deleteBookmarkItem } = useDeleteBookmarkItem();
  const { mutateAsync: updateBookmarkItem } = useUpdateBookmarkItem();

  const onEditBookmark = async (folderItem: SqluiCore.FolderItem) => {
    try {
      const newName = await prompt({
        title: "Bookmark name?",
        message: "A bookmark name",
        value: folderItem.name,
        saveLabel: "Save",
      });

      folderItem.name = newName;

      await updateBookmarkItem(folderItem);
    } catch (err) {
      console.error("index.tsx:updateBookmarkItem", err);
    }
  };

  const onDeleteBookmarkItem = async (folderItem: SqluiCore.FolderItem) => {
    try {
      await confirm(`Do you want to delete this bookmark "${folderItem.name}"?`);
      await deleteBookmarkItem(folderItem.id);
    } catch (err) {
      console.error("index.tsx:deleteBookmarkItem", err);
    }
  };

  return (
    <Box sx={{ display: "flex", gap: 1 }}>
      <IconButton aria-label="Edit bookmark" onClick={() => onEditBookmark(folderItem)}>
        <EditIcon />
      </IconButton>
      <IconButton aria-label="Delete bookmark" onClick={() => onDeleteBookmarkItem(folderItem)}>
        <DeleteForeverIcon />
      </IconButton>
    </Box>
  );
}

/**
 * Builds the column definitions for the bookmarks data table.
 * @param onAfterSelect - Optional callback invoked after a bookmark is selected.
 * @param allExpanded - Whether all query detail rows should be expanded by default.
 * @returns An array of TanStack column definitions.
 */
const getColumns = (onAfterSelect?: OnAfterSelectCallback, allExpanded?: boolean): ColumnDef<any, any>[] => {
  return [
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
      cell: (info) => <NameCell row={info.row} onAfterSelect={onAfterSelect} />,
    },
    {
      header: "Details",
      id: "details",
      cell: (info) => <QueryDetailCell row={info.row} allExpanded={allExpanded ?? false} />,
    },
    {
      header: "Type",
      accessorKey: "type",
      size: 100,
      cell: (info) => <TypeCell row={info.row} />,
    },
    {
      header: "",
      id: "action",
      size: 80,
      cell: (info) => <ActionCell row={info.row} />,
    },
  ];
};

/** Props for the BookmarksItemList component. */
type BookmarksItemListProps = {
  onAfterSelect?: OnAfterSelectCallback;
  hideActions?: boolean;
};

/**
 * Displays a data table of bookmarked connections and queries with edit/delete actions.
 * @param props - Configuration including optional after-select callback and whether to hide action buttons.
 * @returns The rendered bookmarks list, a loading indicator, or an empty state message.
 */
export default function BookmarksItemList(props: BookmarksItemListProps): JSX.Element | null {
  const { onAfterSelect, hideActions } = props;
  const { data, isLoading } = useGetBookmarkItems();
  const [allExpanded, setAllExpanded] = useState(false);

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

  const folderItems = data || [];
  if (folderItems.length === 0) {
    return <Typography>No bookmarks...</Typography>;
  }

  const hasQueryItems = folderItems.some((item) => item.type === "Query" && item.data?.sql);

  const columns = getColumns(onAfterSelect, allExpanded).filter((column) => {
    if (hideActions) {
      if (column.id === "action") {
        return false;
      }
    }
    return true;
  });

  return (
    <>
      {hasQueryItems && (
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 1 }}>
          <Tooltip title={allExpanded ? "Collapse all details" : "Expand all details"}>
            <IconButton size="small" onClick={() => setAllExpanded(!allExpanded)}>
              {allExpanded ? <UnfoldLessIcon fontSize="small" /> : <UnfoldMoreIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      )}
      <DataTable data={folderItems} columns={columns} />
    </>
  );
}

/**
 * Wrapper around BookmarksItemList intended for use inside a modal, with a link to the full bookmarks page.
 * @param props - Configuration including optional after-select callback.
 * @returns The rendered bookmarks modal content.
 */
export function BookmarksItemListModalContent(props: BookmarksItemListProps): JSX.Element | null {
  const { onAfterSelect } = props;

  return (
    <>
      <BookmarksItemList onAfterSelect={onAfterSelect} />
      <Box sx={{ mt: 2 }}>
        <Button
          component={RouterLink}
          to="/bookmarks"
          onClick={onAfterSelect}
          variant="outlined"
          size="small"
          startIcon={<OpenInNewIcon />}
        >
          More Details
        </Button>
      </Box>
    </>
  );
}
