import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import IconButton from "@mui/material/IconButton";
import { useNavigate } from "src/frontend/utils/commonUtils";
import { useState } from "react";
import { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { getTableActions, isDialectSupportManagedMetadata, isDialectSupportVisualization } from "src/common/adapters/DataScriptFactory";
import DropdownButton from "src/frontend/components/DropdownButton";
import { useCommands } from "src/frontend/components/MissionControl";
import { ProxyApi } from "src/frontend/data/api";
import { useDeleteManagedTable, useUpdateManagedTable } from "src/frontend/hooks/useManagedMetadata";
import { useGetColumns, useGetConnectionById, useRefreshTable } from "src/frontend/hooks/useConnection";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";
import { useQuerySizeSetting } from "src/frontend/hooks/useSetting";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import { SqlAction } from "typings";

/** Props for the TableActions component. */
type TableActionsProps = {
  /** ID of the connection. */
  connectionId: string;
  /** ID of the database. */
  databaseId: string;
  /** Unique identifier of the table (UUID for managed tables). */
  tableId: string;
  /** Display name of the table (defaults to tableId if not provided). */
  tableName?: string;
};

/**
 * Dropdown button showing available actions for a specific table (e.g., select, insert, visualize).
 * Lazily fetches columns only when the dropdown is opened.
 * @param props - Contains connectionId, databaseId, and tableId to determine available actions.
 * @returns The dropdown button or null if context menu is disabled.
 */
export default function TableActions(props: TableActionsProps): JSX.Element | null {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const querySize = useQuerySizeSetting();
  let databaseId: string | undefined = props.databaseId;
  let connectionId: string | undefined = props.connectionId;
  let tableId: string | undefined = props.tableId;
  const { selectCommand } = useCommands();
  const { data: treeActions } = useTreeActions();
  const { confirm, prompt } = useActionDialogs();
  const { mutateAsync: updateTable } = useUpdateManagedTable();
  const { mutateAsync: deleteTable } = useDeleteManagedTable();
  const refreshTable = useRefreshTable();

  if (!open) {
    // if table action is not opened, hen we don't need to do this...
    databaseId = undefined;
    connectionId = undefined;
    tableId = undefined;
  }

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(connectionId);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(connectionId, databaseId, tableId);

  const dialect = connection?.dialect;

  const isLoading = loadingConnection || loadingColumns;
  const isManagedMetadata = isDialectSupportManagedMetadata(dialect);

  let actions: SqlAction.Output[] = [];

  if (isDialectSupportVisualization(dialect)) {
    actions = [
      ...actions,
      {
        label: "Visualize",
        description: `Visualize all tables in this database.`,
        icon: <SsidChartIcon />,
        onClick: () => navigate(`/visualization/${connectionId}/${databaseId}/${tableId}`),
      },
      getDivider(),
    ];
  }

  if (isManagedMetadata) {
    // Managed metadata tables (REST API requests): Open, Edit, Delete only
    const displayName = props.tableName ?? props.tableId;
    actions = [
      ...actions,
      {
        label: "Open Request",
        description: "Load the saved query for this request.",
        icon: <OpenInNewIcon />,
        onClick: async () => {
          if (!props.connectionId || !props.databaseId || !props.tableId) return;
          try {
            const managed = await ProxyApi.getManagedTable(props.connectionId, props.databaseId, props.tableId);
            const savedQuery = (managed?.props as { query?: string } | undefined)?.query ?? "";
            selectCommand({
              event: "clientEvent/query/apply",
              data: {
                connectionId: props.connectionId,
                databaseId: props.databaseId,
                tableId: props.tableId,
                tableName: displayName,
                sql: savedQuery,
              },
              label: `Opened request "${displayName}".`,
            });
          } catch (err) {
            console.error("TableActions:openRequest", err);
          }
        },
      },
      {
        label: "Edit Request",
        description: "Rename this request.",
        icon: <EditIcon />,
        onClick: async () => {
          try {
            const newName = await prompt({
              title: "Rename Request",
              message: "Enter new request name:",
              required: true,
              value: displayName,
            });
            if (newName && newName !== displayName && props.connectionId && props.databaseId && props.tableId) {
              await updateTable({
                connectionId: props.connectionId,
                databaseId: props.databaseId,
                managedTableId: props.tableId,
                body: { name: newName },
              });
            }
          } catch (_err) {
            // user dismissed dialog
          }
        },
      },
      {
        label: "Delete Request",
        description: "Delete this request.",
        icon: <DeleteIcon />,
        onClick: async () => {
          try {
            await confirm(`Are you sure you want to delete request "${displayName}"?`, "Delete");
            if (props.connectionId && props.databaseId && props.tableId) {
              await deleteTable({
                connectionId: props.connectionId,
                databaseId: props.databaseId,
                managedTableId: props.tableId,
              });
            }
          } catch (_err) {
            // user dismissed dialog
          }
        },
      },
    ];
  } else {
    actions = [
      ...actions,
      ...getTableActions({
        dialect,
        connectionId,
        databaseId,
        tableId,
        columns: columns || [],
        querySize,
      }),
      getDivider(),
      {
        label: "Refresh",
        description: "Refresh table columns cache.",
        icon: <RefreshIcon />,
        onClick: () => {
          if (props.connectionId && props.databaseId && props.tableId) {
            refreshTable(props.connectionId, props.databaseId, props.tableId);
          }
        },
      },
    ];
  }

  const options = actions.map((action) => ({
    label: action.label,
    startIcon: action.icon,
    onClick: async () =>
      action?.onClick
        ? action.onClick()
        : action.query &&
          selectCommand({
            event: "clientEvent/query/apply",
            data: {
              connectionId,
              databaseId,
              tableId: tableId,
              sql: action.query,
            },
            label: `Applied "${action.label}" to active query tab.`,
          }),
  }));

  if (!treeActions.showContextMenu) {
    return null;
  }

  return (
    <div className="TableActions">
      <DropdownButton id="table-action-split-button" options={options} onToggle={(newOpen) => setOpen(newOpen)} isLoading={isLoading}>
        <IconButton aria-label="Table Actions" size="small" color="inherit">
          <ArrowDropDownIcon fontSize="inherit" color="inherit" />
        </IconButton>
      </DropdownButton>
    </div>
  );
}
