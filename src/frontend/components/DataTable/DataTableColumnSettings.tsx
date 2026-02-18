import SettingsIcon from "@mui/icons-material/Settings";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import { Table, VisibilityState } from "@tanstack/react-table";
import React, { useState } from "react";
import { useActionDialogs } from "src/frontend/hooks/useActionDialogs";

type DataTableColumnSettingsProps = {
  table: Table<any>;
};

function DataTableColumnSettingsContent({ table }: DataTableColumnSettingsProps) {
  const allColumns = table.getAllColumns();
  const defaultOrder = allColumns.map((c) => c.id);

  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const currentOrder = table.getState().columnOrder;
    return currentOrder.length > 0 ? currentOrder : defaultOrder;
  });
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => table.getState().columnVisibility);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const onToggle = (columnId: string) => {
    const next = { ...columnVisibility, [columnId]: !isVisible(columnId) };
    setColumnVisibility(next);
    table.setColumnVisibility(next);
  };

  const isVisible = (columnId: string) => {
    return columnVisibility[columnId] !== false;
  };

  const onDragStart = (e: React.DragEvent, idx: number) => {
    setDragIdx(idx);
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) return;

    const newOrder = [...columnOrder];
    const [removed] = newOrder.splice(dragIdx, 1);
    newOrder.splice(dropIdx, 0, removed);
    setColumnOrder(newOrder);
    setDragIdx(null);
    table.setColumnOrder(newOrder);
  };

  const onReset = () => {
    setColumnOrder(defaultOrder);
    setColumnVisibility({});
    table.setColumnOrder(defaultOrder);
    table.setColumnVisibility({});
  };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mb: 1 }}>
        <Button
          size="small"
          onClick={() => {
            const next: VisibilityState = {};
            columnOrder.forEach((id) => (next[id] = true));
            setColumnVisibility(next);
            table.setColumnVisibility(next);
          }}
        >
          Select All
        </Button>
        <Button
          size="small"
          onClick={() => {
            const next: VisibilityState = {};
            columnOrder.forEach((id) => (next[id] = false));
            setColumnVisibility(next);
            table.setColumnVisibility(next);
          }}
        >
          Clear All
        </Button>
        <Button
          size="small"
          onClick={() => {
            const visible = columnOrder.filter((id) => isVisible(id));
            const hidden = columnOrder.filter((id) => !isVisible(id));
            const newOrder = [...visible, ...hidden];
            setColumnOrder(newOrder);
            table.setColumnOrder(newOrder);
          }}
        >
          Pin Visible
        </Button>
        <Button size="small" onClick={onReset}>
          Reset
        </Button>
      </Box>
      <List dense>
        {columnOrder.map((columnId, idx) => {
          const column = allColumns.find((c) => c.id === columnId);
          if (!column) return null;
          const header = typeof column.columnDef.header === "string" ? column.columnDef.header : column.id;
          return (
            <ListItem
              key={columnId}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={onDragOver}
              onDrop={(e) => onDrop(e, idx)}
              sx={{ cursor: "grab", userSelect: "none" }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <DragIndicatorIcon fontSize="small" />
              </ListItemIcon>
              <Checkbox edge="start" checked={isVisible(columnId)} onChange={() => onToggle(columnId)} size="small" />
              <ListItemText primary={header} />
            </ListItem>
          );
        })}
      </List>
    </Box>
  );
}

export default function DataTableColumnSettings({ table }: DataTableColumnSettingsProps) {
  const { modal } = useActionDialogs();

  const onClick = async () => {
    await modal({
      title: "Column Settings",
      message: <DataTableColumnSettingsContent table={table} />,
      showCloseButton: true,
      size: "sm",
    });
  };

  return (
    <Tooltip title="Column settings">
      <IconButton aria-label="Column settings" onClick={onClick}>
        <SettingsIcon />
      </IconButton>
    </Tooltip>
  );
}
