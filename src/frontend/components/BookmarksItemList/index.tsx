import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditIcon from "@mui/icons-material/Edit";
import Backdrop from "@mui/material/Backdrop";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import { Link as RouterLink } from "react-router-dom";
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

function TypeCell({ row }: { row: any }) {
  const folderItem = row.original;
  return <Chip label={folderItem.type} color={folderItem.type === "Connection" ? "success" : "warning"} size="small" />;
}

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

const getColumns = (onAfterSelect?: OnAfterSelectCallback): ColumnDef<any, any>[] => {
  return [
    {
      header: "Name",
      accessorKey: "name",
      cell: (info) => <NameCell row={info.row} onAfterSelect={onAfterSelect} />,
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

  const columns = getColumns(onAfterSelect).filter((column) => {
    if (hideActions) {
      if (column.id === "action") {
        return false;
      }
    }
    return true;
  });

  return (
    <>
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
        <Link component={RouterLink} to="/bookmarks" onClick={onAfterSelect}>
          More Details
        </Link>
      </Box>
    </>
  );
}
