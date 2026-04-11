import React from "react";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import DownloadIcon from "@mui/icons-material/Download";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import Backdrop from "@mui/material/Backdrop";
import Chip from "@mui/material/Chip";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Tab from "@mui/material/Tab";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  Background,
  BaseEdge,
  type Edge,
  type EdgeProps,
  EdgeLabelRenderer,
  getBezierPath,
  Handle,
  MarkerType,
  type Node,
  type NodeProps,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import Breadcrumbs, { BreadcrumbLink } from "src/frontend/components/Breadcrumbs";
import { downloadBlob } from "src/frontend/data/file";
import { useGetAllTableColumns, useGetColumns, useGetConnectionById, useGetDatabases } from "src/frontend/hooks/useConnection";
import { useNavigate } from "src/frontend/utils/commonUtils";
import "src/frontend/App.scss";
import "src/frontend/electronRenderer";

/** Width in pixels for each table node in the diagram. */
const NODE_WIDTH = 180;
/** Height in pixels for each table node in the diagram. */
const NODE_HEIGHT = 50;
/** Font size in pixels for edge label text. */
const EDGE_LABEL_FONT_SIZE = 11;
/** Horizontal gap in pixels between columns in the layout. */
const COL_GAP = 280;
/** Vertical gap in pixels between rows in the layout. */
const ROW_GAP = 120;
/** Padding in pixels used when wrapping overflow nodes. */
const WRAP_PAD = 60;
/** Maximum number of nodes per column before wrapping in horizontal layout. */
const MAX_PER_COL = 8;
/** Maximum number of nodes per row before wrapping in vertical layout. */
const MAX_PER_ROW = 10;

/**
 * Custom node with handles on all four sides for optimal edge routing.
 */
function TableNode({ data }: NodeProps) {
  return (
    <div
      style={{
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: data.isPivot ? 700 : 400,
        color: "#333",
        cursor: "grab",
      }}
    >
      <Handle type="source" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Left} id="left" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Top} id="top" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Right} id="right" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Bottom} id="bottom" style={{ opacity: 0 }} />
      <Handle type="target" position={Position.Left} id="left" style={{ opacity: 0 }} />
      {data.label as string}
    </div>
  );
}

const nodeTypes = { tableNode: TableNode };

/**
 * Custom edge with an HTML label rendered via EdgeLabelRenderer.
 * Collapsed labels show a summary ("2 refs"), expanded show full FK details.
 * Tooltip on collapsed labels shows chip-styled FK details.
 */
function RelationshipEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  selected,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
  const labels: string[] = (data?.labels as string[]) || [];
  const expanded = (data?.expanded as boolean) || false;
  const displayText = expanded ? labels.join(" | ") : getCollapsedLabel(labels, data?.pivotTable as string);

  const tooltipContent = (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, p: 0.5 }}>
      {labels.map((label, i) => {
        const parts = label.split(" = ");
        return (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Chip label={parts[0]} size="small" color="primary" variant="outlined" />
            <span>=</span>
            <Chip label={parts[1]} size="small" color="secondary" variant="outlined" />
          </Box>
        );
      })}
    </Box>
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: selected ? 2.5 : (style?.strokeWidth ?? 1.5),
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <Tooltip title={expanded ? "" : tooltipContent} placement="top">
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              fontSize: EDGE_LABEL_FONT_SIZE,
              color: "#aaa",
              background: "rgba(42, 42, 42, 0.9)",
              padding: "4px 6px",
              borderRadius: 4,
              pointerEvents: "all",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            className="nodrag nopan"
          >
            {displayText}
          </div>
        </Tooltip>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { relationship: RelationshipEdgeComponent };

/**
 * Picks the best handle pair (source side, target side) based on node center positions.
 */
function pickBestHandles(
  sourcePos: { x: number; y: number },
  targetPos: { x: number; y: number },
): { sourceHandle: string; targetHandle: string } {
  const dx = targetPos.x + NODE_WIDTH / 2 - (sourcePos.x + NODE_WIDTH / 2);
  const dy = targetPos.y + NODE_HEIGHT / 2 - (sourcePos.y + NODE_HEIGHT / 2);

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? { sourceHandle: "right", targetHandle: "left" } : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy > 0 ? { sourceHandle: "bottom", targetHandle: "top" } : { sourceHandle: "top", targetHandle: "bottom" };
}

/** Represents a single foreign key relationship edge between two tables. */
type RelationshipEdge = {
  /** Table that holds the foreign key. */
  sourceTable: string;
  /** Table being referenced by the foreign key. */
  targetTable: string;
  /** Column in the source table that is the foreign key. */
  sourceColumn: string;
  /** Column in the target table being referenced. */
  targetColumn: string;
  /** Human-readable label for the relationship (e.g. "orders.userId = users.id"). */
  label: string;
};

/**
 * Builds relationship edges from column metadata for all tables.
 */
function buildRelationships(allColumns: Record<string, any[]>): RelationshipEdge[] {
  const relationships: RelationshipEdge[] = [];
  for (const tableName of Object.keys(allColumns).sort()) {
    const tableColumns = allColumns[tableName];
    for (const col of tableColumns) {
      if (col.referencedColumnName && col.referencedTableName) {
        relationships.push({
          sourceTable: tableName,
          targetTable: col.referencedTableName,
          sourceColumn: col.name,
          targetColumn: col.referencedColumnName,
          label: `${tableName}.${col.name} = ${col.referencedTableName}.${col.referencedColumnName}`,
        });
      }
    }
  }
  return relationships;
}

/** Aggregated relationship counts for a single table. */
type RelationshipCount = {
  /** Total number of FK relationships (references + referencedBy). */
  total: number;
  /** Number of outgoing FKs (this table references other tables). */
  references: number;
  /** Number of incoming FKs (other tables reference this table). */
  referencedBy: number;
};

/**
 * Counts references (outgoing FKs) and referenced-by (incoming FKs) for each table.
 */
function countRelationships(relationships: RelationshipEdge[]): Record<string, RelationshipCount> {
  const counts: Record<string, RelationshipCount> = {};
  const ensure = (t: string) => {
    if (!counts[t]) counts[t] = { total: 0, references: 0, referencedBy: 0 };
  };
  for (const rel of relationships) {
    ensure(rel.sourceTable);
    ensure(rel.targetTable);
    // Source table has an outgoing FK (it references the target)
    counts[rel.sourceTable].references++;
    counts[rel.sourceTable].total++;
    // Target table has an incoming FK (it's depended on by the source)
    counts[rel.targetTable].referencedBy++;
    counts[rel.targetTable].total++;
  }
  return counts;
}

/**
 * Formats the relationship count for display in the dropdown.
 */
function formatRelationshipCount(count: RelationshipCount | undefined): string {
  if (!count) return "0";
  const parts: string[] = [];
  if (count.references > 0) parts.push(`${count.references} ref${count.references > 1 ? "s" : ""}`);
  if (count.referencedBy > 0) parts.push(`${count.referencedBy} dep${count.referencedBy > 1 ? "s" : ""}`);
  return `${count.total}: ${parts.join(", ")}`;
}

/**
 * Generates a collapsed summary label for grouped edges, e.g. "2 refs" or "1 dep".
 */
function getCollapsedLabel(labels: string[], pivotTable: string): string {
  if (labels.length <= 1) return labels[0] || "";
  // Count how many are refs (source = pivot) vs deps (target = pivot)
  let refs = 0;
  let deps = 0;
  for (const label of labels) {
    const sourceTable = label.split(".")[0];
    if (sourceTable === pivotTable) {
      refs++;
    } else {
      deps++;
    }
  }
  const parts: string[] = [];
  if (refs > 0) parts.push(`${refs} ref${refs > 1 ? "s" : ""}`);
  if (deps > 0) parts.push(`${deps} dep${deps > 1 ? "s" : ""}`);
  return parts.join(", ");
}

/**
 * Classifies tables related to the pivot as ref-only, dep-only, or hybrid.
 */
function classifyTables(pivotTable: string, relationships: RelationshipEdge[]): { refOnly: string[]; depOnly: string[]; hybrid: string[] } {
  const refs = new Set<string>();
  const deps = new Set<string>();
  for (const rel of relationships) {
    if (rel.sourceTable === pivotTable) {
      refs.add(rel.targetTable);
    }
    if (rel.targetTable === pivotTable) {
      deps.add(rel.sourceTable);
    }
  }
  const refOnly: string[] = [];
  const depOnly: string[] = [];
  const hybrid: string[] = [];
  const allTables = new Set([...refs, ...deps]);
  for (const table of [...allTables].sort()) {
    const isRef = refs.has(table);
    const isDep = deps.has(table);
    if (isRef && isDep) {
      hybrid.push(table);
    } else if (isRef) {
      refOnly.push(table);
    } else {
      depOnly.push(table);
    }
  }
  return { refOnly, depOnly, hybrid };
}

/**
 * Places items in columns that wrap after maxPerCol, returning positions.
 * Columns grow inward (toward centerX) from the starting x.
 */
function placeColumnsWrapped(
  items: string[],
  startX: number,
  centerY: number,
  direction: 1 | -1,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (items.length === 0) return positions;
  const totalHeight = Math.min(items.length, MAX_PER_COL) * (NODE_HEIGHT + WRAP_PAD);
  const startY = centerY - totalHeight / 2;
  items.forEach((table, i) => {
    const col = Math.floor(i / MAX_PER_COL);
    const row = i % MAX_PER_COL;
    positions[table] = {
      x: startX + col * (NODE_WIDTH + WRAP_PAD) * direction,
      y: startY + row * (NODE_HEIGHT + WRAP_PAD),
    };
  });
  return positions;
}

/**
 * Places items in rows that wrap after maxPerRow, returning positions.
 * Rows grow inward (toward centerY) from the starting y.
 */
function placeRowsWrapped(items: string[], centerX: number, startY: number, direction: 1 | -1): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};
  if (items.length === 0) return positions;
  const totalWidth = Math.min(items.length, MAX_PER_ROW) * (NODE_WIDTH + WRAP_PAD);
  const startX = centerX - totalWidth / 2;
  items.forEach((table, i) => {
    const row = Math.floor(i / MAX_PER_ROW);
    const col = i % MAX_PER_ROW;
    positions[table] = {
      x: startX + col * (NODE_WIDTH + WRAP_PAD),
      y: startY + row * (NODE_HEIGHT + WRAP_PAD) * direction,
    };
  });
  return positions;
}

/** Layout orientation for the relationship diagram. */
type Orientation = "horizontal" | "vertical";

/**
 * Computes a 3-column (horizontal) or 3-row (vertical) layout.
 * Horizontal: left (refs), center (pivot + hybrid), right (deps).
 * Vertical: top (refs), center (pivot + hybrid), bottom (deps).
 */
function computeLayout(
  pivotTable: string,
  relationships: RelationshipEdge[],
  containerWidth: number,
  containerHeight: number,
  orientation: Orientation,
): Record<string, { x: number; y: number }> {
  const { refOnly, depOnly, hybrid } = classifyTables(pivotTable, relationships);
  const positions: Record<string, { x: number; y: number }> = {};

  const centerX = containerWidth / 2 - NODE_WIDTH / 2;
  const centerY = containerHeight / 2 - NODE_HEIGHT / 2;

  // Place pivot at center
  positions[pivotTable] = { x: centerX, y: centerY };

  if (orientation === "horizontal") {
    // Center column: pivot + hybrid
    const centerItems = hybrid;
    const centerStartY = centerY + NODE_HEIGHT + WRAP_PAD;
    centerItems.forEach((table, i) => {
      positions[table] = { x: centerX, y: centerStartY + i * (NODE_HEIGHT + WRAP_PAD) };
    });

    // Left column: refs (pivot references these)
    const leftX = centerX - COL_GAP;
    Object.assign(positions, placeColumnsWrapped(refOnly, leftX, centerY, -1));

    // Right column: deps (these depend on pivot)
    const rightX = centerX + COL_GAP;
    Object.assign(positions, placeColumnsWrapped(depOnly, rightX, centerY, 1));
  } else {
    // Center row: pivot + hybrid
    const centerItems = hybrid;
    const centerStartX = centerX + NODE_WIDTH + WRAP_PAD;
    centerItems.forEach((table, i) => {
      positions[table] = { x: centerStartX + i * (NODE_WIDTH + WRAP_PAD), y: centerY };
    });

    // Top row: refs
    const topY = centerY - ROW_GAP * 2;
    Object.assign(positions, placeRowsWrapped(refOnly, centerX, topY, -1));

    // Bottom row: deps
    const bottomY = centerY + ROW_GAP * 2;
    Object.assign(positions, placeRowsWrapped(depOnly, centerX, bottomY, 1));
  }

  return positions;
}

/**
 * Inner component that uses the React Flow hooks (must be inside ReactFlowProvider).
 */
function RelationshipChart({
  allColumns,
  pivotTable,
  containerRef,
}: {
  allColumns: Record<string, any[]>;
  pivotTable: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [orientation, setOrientation] = useState<Orientation>("horizontal");
  const { fitView } = useReactFlow();
  const layoutKeyRef = useRef(0);

  const allRelationships = useMemo(() => buildRelationships(allColumns), [allColumns]);

  const filteredRelationships = useMemo(
    () => allRelationships.filter((r) => r.sourceTable === pivotTable || r.targetTable === pivotTable),
    [allRelationships, pivotTable],
  );

  const relatedTables = useMemo(() => {
    const tables = new Set<string>([pivotTable]);
    for (const rel of filteredRelationships) {
      tables.add(rel.sourceTable);
      tables.add(rel.targetTable);
    }
    return [...tables];
  }, [filteredRelationships, pivotTable]);

  const buildLayout = useCallback(() => {
    const w = containerRef.current?.clientWidth || 1200;
    const h = containerRef.current?.clientHeight || 700;
    return computeLayout(pivotTable, filteredRelationships, w, h, orientation);
  }, [pivotTable, filteredRelationships, orientation]);

  const buildNodesAndEdges = useCallback(
    (layout: Record<string, { x: number; y: number }>) => {
      const newNodes: Node[] = relatedTables.map((table) => ({
        id: table,
        type: "tableNode",
        position: layout[table] || { x: 0, y: 0 },
        data: { label: table, isPivot: table === pivotTable },
      }));

      const grouped: Record<string, { source: string; target: string; labels: string[] }> = {};
      for (const rel of filteredRelationships) {
        const key = `${rel.sourceTable}||${rel.targetTable}`;
        if (!grouped[key]) {
          grouped[key] = { source: rel.sourceTable, target: rel.targetTable, labels: [] };
        }
        grouped[key].labels.push(rel.label);
      }

      const newEdges: Edge[] = Object.entries(grouped).map(([key, group]) => {
        const sourcePos = layout[group.source] || { x: 0, y: 0 };
        const targetPos = layout[group.target] || { x: 0, y: 0 };
        const { sourceHandle, targetHandle } = pickBestHandles(sourcePos, targetPos);
        return {
          id: `e-${key}`,
          source: group.source,
          target: group.target,
          sourceHandle,
          targetHandle,
          type: "relationship",
          animated: false,
          style: { stroke: "#888", strokeWidth: 1.5 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#e0e0e0",
            width: 20,
            height: 20,
          },
          data: { labels: group.labels, expanded, pivotTable },
        };
      });

      return { newNodes, newEdges };
    },
    [relatedTables, filteredRelationships, pivotTable, expanded],
  );

  const initialLayout = useMemo(() => buildLayout(), [buildLayout]);
  const { newNodes: initialNodes, newEdges: initialEdges } = useMemo(
    () => buildNodesAndEdges(initialLayout),
    [initialLayout, buildNodesAndEdges],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    layoutKeyRef.current++;
    const layout = buildLayout();
    const { newNodes, newEdges } = buildNodesAndEdges(layout);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ padding: 0.3 }), 100);
  }, [pivotTable, orientation, JSON.stringify(Object.keys(allColumns))]);

  // Update edge data when expand/collapse changes
  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        data: { ...edge.data, expanded },
      })),
    );
  }, [expanded]);

  // Edge click cycling: first click selects source, second selects target
  const lastClickedEdgeRef = useRef<string | null>(null);
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      const selectNode = (nodeId: string) => {
        setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
      };

      if (lastClickedEdgeRef.current === edge.id) {
        // Second click on same edge — select target
        selectNode(edge.target);
        lastClickedEdgeRef.current = null;
      } else {
        // First click — select source
        selectNode(edge.source);
        lastClickedEdgeRef.current = edge.id;
      }
    },
    [setNodes],
  );

  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: Node[] }) => {
      const selectedIds = new Set(selectedNodes.map((n) => n.id));

      setEdges((eds) =>
        eds.map((edge) => {
          const isHighlighted = selectedIds.has(edge.source) || selectedIds.has(edge.target);
          return {
            ...edge,
            animated: isHighlighted,
            style: {
              ...edge.style,
              strokeWidth: isHighlighted ? 2.5 : 1.5,
            },
          };
        }),
      );
    },
    [setEdges],
  );

  const onRedraw = useCallback(() => {
    const layout = buildLayout();
    const { newNodes, newEdges } = buildNodesAndEdges(layout);
    setNodes(newNodes);
    setEdges(newEdges);
    setTimeout(() => fitView({ padding: 0.3 }), 100);
  }, [buildLayout, buildNodesAndEdges, fitView, setNodes, setEdges]);

  // Export the diagram container as a high-res PNG (5x pixel ratio)
  const onDownload = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        pixelRatio: 5,
        // Exclude React Flow UI controls from the exported image
        filter: (node) => {
          if (
            node?.classList?.contains("react-flow__minimap") ||
            node?.classList?.contains("react-flow__controls") ||
            node?.classList?.contains("react-flow__attribution") ||
            node?.classList?.contains("react-flow__panel")
          ) {
            return false;
          }
          return true;
        },
      });
      await downloadBlob(`relationship-${pivotTable}-${new Date().toISOString()}.png`, dataUrl);
    } catch (err) {
      console.error("RelationshipChartPage:onDownload", err);
    }
  }, [pivotTable]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onEdgeClick={onEdgeClick}
      onSelectionChange={onSelectionChange}
      fitView
      snapToGrid
      minZoom={0.1}
      maxZoom={4}
      panOnDrag
      zoomOnScroll
      selectNodesOnDrag={false}
    >
      <Background gap={20} size={1} />
      <Panel position="top-right">
        <Box sx={{ display: "flex", gap: 0.5 }}>
          <Tooltip title={expanded ? "Collapse Labels" : "Expand Labels"}>
            <IconButton size="small" onClick={() => setExpanded(!expanded)} sx={{ color: "text.secondary" }}>
              {expanded ? <UnfoldLessIcon /> : <UnfoldMoreIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title={orientation === "horizontal" ? "Switch to Vertical" : "Switch to Horizontal"}>
            <IconButton
              size="small"
              onClick={() => setOrientation(orientation === "horizontal" ? "vertical" : "horizontal")}
              sx={{ color: "text.secondary" }}
            >
              {orientation === "horizontal" ? <SwapVertIcon /> : <SwapHorizIcon />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Redraw Layout">
            <IconButton size="small" onClick={onRedraw} sx={{ color: "text.secondary" }}>
              <AutorenewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download as PNG">
            <IconButton size="small" onClick={onDownload} sx={{ color: "text.secondary" }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Panel>
    </ReactFlow>
  );
}

/** Column keys available for sorting the relationship table. */
type SortColumn = "sourceTable" | "targetTable" | "type";
/** Sort direction for the relationship table. */
type SortDirection = "asc" | "desc";

/**
 * Returns the relationship type label for a given relationship relative to the pivot table.
 */
function getRelationshipType(rel: RelationshipEdge, pivotTable: string): string {
  return rel.sourceTable === pivotTable ? "Ref" : "Dep";
}

/**
 * Table view showing relationships as sortable rows with source table, destination table, and relationship details.
 */
function RelationshipTable({ relationships, pivotTable }: { relationships: RelationshipEdge[]; pivotTable: string }) {
  const [sortBy, setSortBy] = useState<SortColumn>("sourceTable");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const filtered = useMemo(
    () => relationships.filter((r) => r.sourceTable === pivotTable || r.targetTable === pivotTable),
    [relationships, pivotTable],
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp: number;
      if (sortBy === "type") {
        cmp = getRelationshipType(a, pivotTable).localeCompare(getRelationshipType(b, pivotTable));
      } else {
        cmp = a[sortBy].localeCompare(b[sortBy]);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir, pivotTable]);

  // Toggle sort direction if clicking the same column, otherwise switch column
  const onSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  };

  if (filtered.length === 0) {
    return (
      <Typography variant="body1" sx={{ mx: 2, mt: 2, color: "text.secondary" }}>
        No relationships found for table &quot;{pivotTable}&quot;.
      </Typography>
    );
  }

  return (
    <TableContainer sx={{ maxHeight: "calc(100vh - 160px)" }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>
              <TableSortLabel
                active={sortBy === "sourceTable"}
                direction={sortBy === "sourceTable" ? sortDir : "asc"}
                onClick={() => onSort("sourceTable")}
              >
                Source Table
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>
              <TableSortLabel
                active={sortBy === "targetTable"}
                direction={sortBy === "targetTable" ? sortDir : "asc"}
                onClick={() => onSort("targetTable")}
              >
                Destination Table
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>
              <TableSortLabel active={sortBy === "type"} direction={sortBy === "type" ? sortDir : "asc"} onClick={() => onSort("type")}>
                Type
              </TableSortLabel>
            </TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Details</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((rel, i) => {
            // Ref = pivot references target, Dep = source depends on pivot
            const isRef = rel.sourceTable === pivotTable;
            return (
              <TableRow key={i}>
                <TableCell>{rel.sourceTable}</TableCell>
                <TableCell>{rel.targetTable}</TableCell>
                <TableCell>
                  <Tooltip
                    title={
                      isRef
                        ? `${pivotTable} references ${rel.targetTable} via foreign key`
                        : `${rel.sourceTable} depends on ${pivotTable} via foreign key`
                    }
                  >
                    <span>{isRef ? "Ref" : "Dep"}</span>
                  </Tooltip>
                </TableCell>
                {/* Details column uses colored chips: primary for source table, secondary for target */}
                <TableCell>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      flexWrap: "wrap",
                    }}
                  >
                    <Chip label={rel.sourceTable} size="small" color="primary" variant="outlined" />
                    <Chip label={rel.sourceColumn} size="small" variant="outlined" />
                    <span>=</span>
                    <Chip label={rel.targetTable} size="small" color="secondary" variant="outlined" />
                    <Chip label={rel.targetColumn} size="small" variant="outlined" />
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Main page component for the relationship visualization view.
 * Route: /visualization/:connectionId/:databaseId/:tableId
 *
 * Two tabs (using display:none to preserve diagram state across switches):
 * - Diagram: React Flow interactive graph with 3-column/3-row layout
 * - Table: Sortable MUI table with Ref/Dep types and chip-based FK details
 *
 * The breadcrumb includes a dropdown to select the pivot table, showing
 * relationship counts like "cpt (9: 4 refs, 5 deps)".
 */
export default function RelationshipChartPage() {
  const navigate = useNavigate();
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const databaseId = urlParams.databaseId as string;
  const tableId = urlParams.tableId as string;

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTable, setSelectedTable] = useState<string>(tableId || "");
  const [tabIdx, setTabIdx] = useState(0);

  // Fetch connection details, databases, and column metadata
  const {
    data: connection,
    refetch: refetchConnection,
    error: errorConnection,
    isLoading: loadingConnection,
  } = useGetConnectionById(connectionId);

  const { data: databases, refetch: refetchDatabases, error: errorDatabases, isLoading: loadingDatabases } = useGetDatabases(connectionId);

  const {
    data: allColumns,
    refetch: refetchAllColumns,
    error: errorAllColumns,
    isLoading: loadingAllColumns,
  } = useGetAllTableColumns(connectionId, databaseId);

  const {
    refetch: refetchActiveTableColumns,
    error: errorActiveTableColumns,
    isLoading: loadingActiveTableColumns,
  } = useGetColumns(connectionId, databaseId, tableId);

  const isLoading = loadingAllColumns || loadingConnection || loadingActiveTableColumns || loadingDatabases;
  const hasError = errorAllColumns || errorConnection || errorActiveTableColumns || errorDatabases;

  const allRelationships = useMemo(() => (allColumns ? buildRelationships(allColumns) : []), [allColumns]);

  const relationshipCounts = useMemo(() => countRelationships(allRelationships), [allRelationships]);

  const tablesWithRelationships = useMemo(() => {
    const tables = new Set<string>();
    for (const rel of allRelationships) {
      tables.add(rel.sourceTable);
      tables.add(rel.targetTable);
    }
    return [...tables].sort();
  }, [allRelationships]);

  // Refetch data when route params change
  useEffect(() => {
    refetchConnection();
    refetchAllColumns();
    refetchActiveTableColumns();
    refetchDatabases();
  }, [connectionId, databaseId, tableId]);

  // Auto-select first table with relationships if none specified in URL
  useEffect(() => {
    if (tableId) {
      setSelectedTable(tableId);
    } else if (tablesWithRelationships.length > 0 && !selectedTable) {
      setSelectedTable(tablesWithRelationships[0]);
    }
  }, [tableId, tablesWithRelationships]);

  // Full-screen loading spinner while fetching data
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
          Loading Visualization...
        </Typography>
      </Backdrop>
    );
  }

  if (hasError) {
    return (
      <Typography variant="h6" sx={{ mx: 4, mt: 2, color: "error.main" }}>
        There are some errors because we can&apos;t fetch the related connection or columns in this table.
      </Typography>
    );
  }

  const breadcrumbsData: BreadcrumbLink[] = [
    {
      label: (
        <>
          <SsidChartIcon fontSize="inherit" />
          Visualization
        </>
      ),
    },
    {
      label: <>{connection?.name}</>,
      href: `/visualization/${connectionId}`,
    },
    {
      label: <>{databaseId}</>,
      href: `/visualization/${connectionId}/${databaseId}`,
    },
  ];

  // Last breadcrumb is a dropdown to switch pivot tables, showing relationship counts
  if (databaseId && tablesWithRelationships.length > 0) {
    breadcrumbsData.push({
      label: (
        <Select
          size="small"
          variant="standard"
          value={selectedTable}
          onChange={(e) => {
            const newTable = e.target.value as string;
            setSelectedTable(newTable);
            navigate(`/visualization/${connectionId}/${databaseId}/${newTable}`);
          }}
          sx={{
            fontSize: "inherit",
            "& .MuiSelect-select": { py: 0 },
            "&:before": { borderBottom: "none" },
          }}
        >
          {tablesWithRelationships.map((table) => (
            <MenuItem key={table} value={table}>
              {table} ({formatRelationshipCount(relationshipCounts[table])})
            </MenuItem>
          ))}
        </Select>
      ),
    });
  }

  // Determine which content to show based on route state
  let contentDom: React.JSX.Element;
  if (!databaseId) {
    // No database selected — show list of available databases
    if (databases && databases.length > 0) {
      contentDom = (
        <>
          <Typography variant="h6" sx={{ mx: 2 }}>
            Select one of the following database to visualize:
          </Typography>
          <List>
            {databases.map((database) => {
              const onNavigateToDatabaseVisualization = () => {
                navigate(`/visualization/${connectionId}/${database.name}`);
              };
              return (
                <ListItem key={database.name} disablePadding>
                  <ListItemButton onClick={onNavigateToDatabaseVisualization}>
                    <ListItemText primary={database.name} />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </>
      );
    } else {
      contentDom = (
        <Typography variant="h6" sx={{ mx: 2, color: "error.main" }}>
          This connection doesn&apos;t have any database.
        </Typography>
      );
    }
  } else if (allColumns && selectedTable && tablesWithRelationships.includes(selectedTable)) {
    contentDom = (
      <>
        <Box sx={{ borderBottom: 1, borderColor: "divider", mx: 2 }}>
          <Tabs value={tabIdx} onChange={(_e, newIdx) => setTabIdx(newIdx)} aria-label="visualization tabs">
            <Tab label="Diagram" />
            <Tab label="Table" />
          </Tabs>
        </Box>
        <Box
          sx={{
            height: "calc(100vh - 160px)",
            zIndex: 0,
            display: tabIdx === 0 ? "block" : "none",
          }}
          ref={chartContainerRef}
        >
          <ReactFlowProvider>
            <RelationshipChart allColumns={allColumns} pivotTable={selectedTable} containerRef={chartContainerRef} />
          </ReactFlowProvider>
        </Box>
        <Box
          sx={{
            display: tabIdx === 1 ? "block" : "none",
            mx: 2,
          }}
        >
          <RelationshipTable relationships={allRelationships} pivotTable={selectedTable} />
        </Box>
      </>
    );
  } else if (allColumns && Object.keys(allColumns).length > 0 && tablesWithRelationships.length === 0) {
    contentDom = (
      <Typography variant="h6" sx={{ mx: 2, color: "text.secondary" }}>
        No foreign key relationships found in database &quot;{databaseId}&quot;.
      </Typography>
    );
  } else {
    contentDom = (
      <Typography variant="h6" sx={{ mx: 2, color: "error.main" }}>
        This database &quot;{databaseId}&quot; doesn&apos;t have any table.
      </Typography>
    );
  }

  return (
    <>
      <Box sx={{ mx: 2, display: "flex", alignItems: "center" }}>
        <Breadcrumbs links={breadcrumbsData} />
      </Box>
      {contentDom}
    </>
  );
}
