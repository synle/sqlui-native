import AddIcon from "@mui/icons-material/Add";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import IconButton from "@mui/material/IconButton";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "src/frontend/utils/commonUtils";
import { useState } from "react";
import { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import {
  getDatabaseActions,
  getTableActions,
  isDialectSupportManagedMetadata,
  isDialectSupportVisualization,
} from "src/common/adapters/DataScriptFactory";
import EditFolderModalBody from "src/frontend/components/DatabaseActions/EditFolderModal";
import DropdownButton from "src/frontend/components/DropdownButton";
import { useCommands } from "src/frontend/components/MissionControl";
import { ProxyApi } from "src/frontend/data/api";
import { useGetConnectionById, useRefreshDatabase } from "src/frontend/hooks/useConnection";
import { useActiveConnectionQuery } from "src/frontend/hooks/useConnectionQuery";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useQuerySizeSetting } from "src/frontend/hooks/useSetting";
import { useShowHide } from "src/frontend/hooks/useShowHide";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import { SqlAction } from "typings";

/** Props for the DatabaseActions component. */
type DatabaseActionsProps = {
  /** The ID of the connection this database belongs to. */
  connectionId: string;
  /** The name/ID of the database to show actions for. */
  databaseId: string;
};

/**
 * A dropdown button that displays available actions for a specific database.
 * Includes select, visualize, and dialect-specific database operations.
 * @param props - Contains connectionId and databaseId.
 * @returns A dropdown button with database actions, or null if context menu is hidden.
 */
export default function DatabaseActions(props: DatabaseActionsProps): JSX.Element | null {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();
  let databaseId: string | undefined = props.databaseId;
  let connectionId: string | undefined = props.connectionId;
  const { selectCommand } = useCommands();
  const { data: treeActions } = useTreeActions();
  const { confirm, modal, dismiss } = useActionDialogs();
  const queryClient = useQueryClient();
  const refreshDatabase = useRefreshDatabase();
  const { onToggle: onTreeToggle } = useShowHide();

  if (!open) {
    // if table action is not opened, hen we don't need to do this...
    databaseId = undefined;
    connectionId = undefined;
  }

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  useActiveConnectionQuery();
  const dialect = connection?.dialect;

  const isLoading = loadingConnection;

  const isRestApi = dialect === "rest";
  const isManagedMetadata = isDialectSupportManagedMetadata(dialect);

  let actions: SqlAction.Output[] = [];

  if (!isManagedMetadata) {
    actions.push({
      label: "Select",
      description: `Selected the related database and connection.`,
      icon: <SelectAllIcon />,
    });
  }

  if (isDialectSupportVisualization(dialect)) {
    actions.push({
      label: "Visualize",
      description: `Visualize all tables in this database.`,
      icon: <SsidChartIcon />,
      onClick: () => navigate(`/visualization/${connectionId}/${databaseId}`),
    });
  }

  // For managed metadata, show template scripts that auto-create a request when selected
  const templateActions: SqlAction.Output[] = isManagedMetadata
    ? getTableActions({ dialect, connectionId, databaseId, tableId: undefined, columns: [], querySize })
    : [];

  actions = [
    ...actions,
    ...getDatabaseActions({
      dialect,
      connectionId,
      databaseId,
      querySize,
    }),
    ...(isManagedMetadata
      ? [
          {
            label: "New Blank Request",
            description: "Create an empty request.",
            icon: <AddIcon />,
            onClick: async () => {
              if (!props.connectionId || !props.databaseId) return;
              const requestName = "New Request";
              try {
                const created = await ProxyApi.createManagedTable(props.connectionId, props.databaseId, { name: requestName });
                queryClient.invalidateQueries({ queryKey: [props.connectionId, props.databaseId, "tables"] });
                // Expand the folder in the tree
                onTreeToggle([props.connectionId, props.databaseId].join(" > "), true);
                selectCommand({
                  event: "clientEvent/query/apply",
                  data: {
                    connectionId: props.connectionId,
                    databaseId: props.databaseId,
                    tableId: created.id,
                    tableName: requestName,
                    sql: "",
                  },
                  label: `Created "${requestName}".`,
                });
              } catch (err) {
                console.error("DatabaseActions:newBlankRequest", err);
              }
            },
          },
          getDivider(),
          ...templateActions,
          getDivider(),
          {
            label: "Edit Folder",
            description: "Edit folder name and variables.",
            icon: <EditIcon />,
            onClick: async () => {
              if (!props.connectionId || !props.databaseId) return;
              try {
                // Fetch current folder props to get existing variables
                const currentFolder = await ProxyApi.getManagedDatabase(props.connectionId, props.databaseId);
                const currentVars = (currentFolder?.props as any)?.variables || [];

                await modal({
                  title: "Edit Folder",
                  message: (
                    <EditFolderModalBody
                      name={props.databaseId}
                      variables={currentVars}
                      onSave={async (newName, newVars) => {
                        const body: { name?: string; props?: any } = {};
                        if (newName !== props.databaseId) body.name = newName;
                        body.props = { variables: newVars };
                        await ProxyApi.updateManagedDatabase(props.connectionId, props.databaseId, body);
                        queryClient.invalidateQueries({ queryKey: [props.connectionId, "databases"] });
                        dismiss();
                      }}
                      onCancel={() => dismiss()}
                    />
                  ),
                  showCloseButton: true,
                  size: "sm",
                });
              } catch (_err) {
                // user dismissed dialog
              }
            },
          },
          {
            label: "Delete Folder",
            description: "Delete this folder and all its requests.",
            icon: <DeleteIcon />,
            onClick: async () => {
              try {
                await confirm(`Are you sure you want to delete folder "${props.databaseId}" and all its requests?`, "Delete");
                if (props.connectionId && props.databaseId) {
                  await ProxyApi.deleteManagedDatabase(props.connectionId, props.databaseId);
                  queryClient.invalidateQueries({ queryKey: [props.connectionId, "databases"] });
                }
              } catch (_err) {
                // user dismissed dialog
              }
            },
          },
        ]
      : []),
    ...(isRestApi
      ? []
      : [
          getDivider(),
          {
            label: "Refresh",
            description: "Refresh database tables and columns cache.",
            icon: <RefreshIcon />,
            onClick: () => {
              if (props.connectionId && props.databaseId) {
                refreshDatabase(props.connectionId, props.databaseId);
              }
            },
          },
        ]),
  ];

  /** Set of template actions that should auto-create a managed request when selected. */
  const templateActionSet = new Set(templateActions);

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () => {
      if (action?.onClick) {
        return action.onClick();
      }

      // For managed metadata template actions, auto-create a request and open it
      if (isManagedMetadata && templateActionSet.has(action) && action.query && props.connectionId && props.databaseId) {
        const requestName = action.label || "New Request";
        try {
          const created = await ProxyApi.createManagedTable(props.connectionId, props.databaseId, { name: requestName });
          await ProxyApi.updateManagedTable(props.connectionId, props.databaseId, created.id, { query: action.query });
          queryClient.invalidateQueries({ queryKey: [props.connectionId, props.databaseId, "tables"] });
          // Expand the folder in the tree
          onTreeToggle([props.connectionId, props.databaseId].join(" > "), true);
          selectCommand({
            event: "clientEvent/query/apply",
            data: {
              connectionId: props.connectionId,
              databaseId: props.databaseId,
              tableId: created.id,
              tableName: requestName,
              sql: action.query,
            },
            label: `Created and opened "${requestName}".`,
          });
        } catch (err) {
          console.error("DatabaseActions:createFromTemplate", err);
        }
        return;
      }

      if (action.query) {
        selectCommand({
          event: "clientEvent/query/apply",
          data: {
            connectionId,
            databaseId,
            tableId: "",
            sql: action.query,
          },
          label: action.description || `Applied "${action.label}" to active query tab.`,
        });
      }
    },
  }));

  if (!treeActions.showContextMenu) {
    return null;
  }

  return (
    <div className="DatabaseActions">
      <DropdownButton id="database-action-split-button" options={options} onToggle={(newOpen) => setOpen(newOpen)} isLoading={isLoading}>
        <IconButton aria-label="Database Actions" size="small" color="inherit">
          <ArrowDropDownIcon fontSize="inherit" color="inherit" />
        </IconButton>
      </DropdownButton>
    </div>
  );
}
