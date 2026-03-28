import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";
import RefreshIcon from "@mui/icons-material/Refresh";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import StarIcon from "@mui/icons-material/Star";
import IconButton from "@mui/material/IconButton";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "src/frontend/utils/commonUtils";
import { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { getConnectionActions, isDialectSupportManagedMetadata } from "src/common/adapters/DataScriptFactory";
import { ProxyApi } from "src/frontend/data/api";
import DropdownButton from "src/frontend/components/DropdownButton";
import { useCommands } from "src/frontend/components/MissionControl";
import { showTestConnectionModal } from "src/frontend/components/TestConnectionButton";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import { SqlAction, SqluiCore } from "typings";

/** Props for the ConnectionActions component. */
type ConnectionActionsProps = {
  connection: SqluiCore.ConnectionProps;
};

/**
 * Dropdown menu of actions available for a database connection (bookmark, edit, export, duplicate, refresh, delete, etc.).
 * @param props - Props containing the connection to display actions for.
 * @returns The rendered dropdown action button, or null if context menus are hidden.
 */
export default function ConnectionActions(props: ConnectionActionsProps): JSX.Element | null {
  const { connection } = props;
  const navigate = useNavigate();
  const { selectCommand } = useCommands();
  const { modal, prompt, dismiss } = useActionDialogs();
  const queryClient = useQueryClient();
  const data = connection;
  const { data: treeActions } = useTreeActions();

  const { dialect, id: connectionId } = connection;
  const isRestApi = dialect === "rest";
  const isManagedMetadata = isDialectSupportManagedMetadata(dialect);

  const options: SqlAction.Output[] = [
    {
      label: "Add to Bookmark",
      onClick: () =>
        selectCommand({
          event: "clientEvent/connection/addToBookmark",
          data,
        }),
      startIcon: <StarIcon />,
    },
    getDivider(),
    {
      label: "Select",
      startIcon: <SelectAllIcon />,
      onClick: () =>
        selectCommand({
          event: "clientEvent/connection/select",
          data,
        }),
    },
    {
      label: "Edit",
      startIcon: <EditIcon />,
      onClick: () => navigate(`/connection/edit/${connection.id}`),
    },
    {
      label: "Export",
      startIcon: <ArrowUpwardIcon />,
      onClick: () =>
        selectCommand({
          event: "clientEvent/connection/export",
          data,
        }),
    },
    ...(isRestApi
      ? [
          {
            label: "Import Collection",
            startIcon: <FileUploadIcon />,
            onClick: () =>
              selectCommand({
                event: "clientEvent/connection/importCollection",
                data,
              }),
          },
          {
            label: "Export as Postman",
            startIcon: <FileDownloadIcon />,
            onClick: () =>
              selectCommand({
                event: "clientEvent/connection/exportAsPostman",
                data,
              }),
          },
        ]
      : []),
    {
      label: "Duplicate",
      startIcon: <ContentCopyIcon />,
      onClick: () =>
        selectCommand({
          event: "clientEvent/connection/duplicate",
          data,
        }),
    },
    ...(isRestApi
      ? []
      : [
          {
            label: "Refresh",
            startIcon: <RefreshIcon />,
            onClick: () =>
              selectCommand({
                event: "clientEvent/connection/refresh",
                data,
              }),
          },
        ]),
    {
      label: "Test Connection",
      startIcon: <NetworkCheckIcon />,
      onClick: () => showTestConnectionModal(connection, modal, dismiss),
    },
    ...(isManagedMetadata
      ? [
          getDivider(),
          {
            label: "New Folder",
            startIcon: <AddIcon />,
            onClick: async () => {
              try {
                const name = await prompt({ title: "New Folder", message: "Enter folder name:", required: true });
                if (name) {
                  await ProxyApi.createManagedDatabase(connectionId!, { name });
                  queryClient.invalidateQueries({ queryKey: [connectionId, "databases"] });
                }
              } catch (_err) {
                // user dismissed dialog
              }
            },
          },
        ]
      : []),
    {
      label: "Delete",
      startIcon: <DeleteIcon />,
      onClick: () =>
        selectCommand({
          event: "clientEvent/connection/delete",
          data,
        }),
    },
    ...getConnectionActions({
      dialect,
      connectionId,
    }).map((action) => ({
      label: action.label,
      startIcon: action.icon,
      onClick: async () =>
        selectCommand({
          event: "clientEvent/query/apply",
          data: {
            connectionId,
            databaseId: "",
            tableId: "",
            sql: action.query,
          },
          label: action.description || `Applied "${action.label}" to active query tab.`,
        }),
    })),
  ];

  if (!treeActions.showContextMenu) {
    return null;
  }

  return (
    <>
      <DropdownButton id="connection-actions-split-button" options={options}>
        <IconButton aria-label="Connection Actions" size="small" color="inherit">
          <ArrowDropDownIcon fontSize="inherit" color="inherit" />
        </IconButton>
      </DropdownButton>
    </>
  );
}
