import DownloadIcon from "@mui/icons-material/Download";
import LabelIcon from "@mui/icons-material/Label";
import LabelOffIcon from "@mui/icons-material/LabelOff";
import SsidChartIcon from "@mui/icons-material/SsidChart";
import Backdrop from "@mui/material/Backdrop";
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
import Tabs from "@mui/material/Tabs";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import {
  Background,
  type Edge,
  type Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs, { BreadcrumbLink } from "src/frontend/components/Breadcrumbs";
import { downloadBlob } from "src/frontend/data/file";
import { useGetAllTableColumns, useGetColumns, useGetConnectionById, useGetDatabases } from "src/frontend/hooks/useConnection";
import { useNavigate } from "src/frontend/utils/commonUtils";
import "src/frontend/App.scss";
import "src/frontend/electronRenderer";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 50;

type RelationshipEdge = {
  sourceTable: string;
  targetTable: string;
  sourceColumn: string;
  targetColumn: string;
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
          label: `${col.name} => ${col.referencedTableName}.${col.referencedColumnName}`,
        });
      }
    }
  }
  return relationships;
}

/**
 * Counts the number of relationships involving each table.
 */
function countRelationships(relationships: RelationshipEdge[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const rel of relationships) {
    counts[rel.sourceTable] = (counts[rel.sourceTable] || 0) + 1;
    counts[rel.targetTable] = (counts[rel.targetTable] || 0) + 1;
  }
  return counts;
}

/**
 * Computes a radial layout around the pivot table for related tables.
 */
function computeLayout(
  pivotTable: string,
  relatedTables: string[],
  containerWidth: number,
  containerHeight: number,
): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {};

  const centerX = containerWidth / 2 - NODE_WIDTH / 2;
  const centerY = containerHeight / 2 - NODE_HEIGHT / 2;

  positions[pivotTable] = { x: centerX, y: centerY };

  const others = relatedTables.filter((t) => t !== pivotTable);
  if (others.length === 0) return positions;

  const radius = Math.min(containerWidth, containerHeight) * 0.35;
  const angleStep = (2 * Math.PI) / others.length;
  const startAngle = -Math.PI / 2;

  others.forEach((table, i) => {
    const angle = startAngle + i * angleStep;
    positions[table] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });

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
  const [showLabels, setShowLabels] = useState(false);
  const { fitView } = useReactFlow();

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

  const initialLayout = useMemo(() => {
    const w = containerRef.current?.clientWidth || 1200;
    const h = containerRef.current?.clientHeight || 700;
    return computeLayout(pivotTable, relatedTables, w, h);
  }, [pivotTable, relatedTables]);

  const initialNodes: Node[] = useMemo(
    () =>
      relatedTables.map((table) => ({
        id: table,
        position: initialLayout[table] || { x: 0, y: 0 },
        data: { label: table },
        style: {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 14,
          fontWeight: table === pivotTable ? 700 : 400,
          cursor: "grab",
        },
      })),
    [relatedTables, initialLayout, pivotTable],
  );

  const initialEdges: Edge[] = useMemo(
    () =>
      filteredRelationships.map((rel, i) => ({
        id: `e-${i}-${rel.sourceTable}.${rel.sourceColumn}-${rel.targetTable}.${rel.targetColumn}`,
        source: rel.sourceTable,
        target: rel.targetTable,
        label: showLabels ? rel.label : undefined,
        type: "default",
        animated: false,
        style: { stroke: "#888", strokeWidth: 1.5 },
        labelStyle: { fontSize: 11, fill: "#ccc" },
        labelBgStyle: { fill: "#1e1e1e", fillOpacity: 0.85 },
        labelBgPadding: [6, 3] as [number, number],
        data: { fullLabel: rel.label },
      })),
    [filteredRelationships, showLabels],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setTimeout(() => fitView({ padding: 0.2 }), 50);
  }, [pivotTable, JSON.stringify(Object.keys(allColumns))]);

  useEffect(() => {
    setEdges((eds) =>
      eds.map((edge) => ({
        ...edge,
        label: showLabels ? (edge.data?.fullLabel as string) : undefined,
      })),
    );
  }, [showLabels]);

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
              stroke: isHighlighted ? "#4a9eff" : "#888",
              strokeWidth: isHighlighted ? 2.5 : 1.5,
              strokeDasharray: isHighlighted ? "6 3" : undefined,
            },
          };
        }),
      );
    },
    [setEdges],
  );

  const onDownload = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      const dataUrl = await toPng(containerRef.current, {
        pixelRatio: 5,
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
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
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
          <Tooltip title={showLabels ? "Hide Labels" : "Show Labels"}>
            <IconButton size="small" onClick={() => setShowLabels(!showLabels)} sx={{ color: "text.secondary" }}>
              {showLabels ? <LabelOffIcon /> : <LabelIcon />}
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

/**
 * Table view showing relationships as rows with source table, destination table, and relationship details.
 */
function RelationshipTable({ relationships, pivotTable }: { relationships: RelationshipEdge[]; pivotTable: string }) {
  const filtered = relationships.filter((r) => r.sourceTable === pivotTable || r.targetTable === pivotTable);

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
            <TableCell sx={{ fontWeight: 700 }}>Source Table</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Destination Table</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Relationship</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filtered.map((rel, i) => (
            <TableRow key={i}>
              <TableCell>{rel.sourceTable}</TableCell>
              <TableCell>{rel.targetTable}</TableCell>
              <TableCell>
                {rel.sourceTable}.{rel.sourceColumn} =&gt; {rel.targetTable}.{rel.targetColumn}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

/**
 * Interactive visualization page showing table relationships using React Flow.
 * Displays foreign key connections between tables with drag, select, and export-to-PNG capabilities.
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

  useEffect(() => {
    refetchConnection();
    refetchAllColumns();
    refetchActiveTableColumns();
    refetchDatabases();
  }, [connectionId, databaseId, tableId]);

  useEffect(() => {
    if (tableId) {
      setSelectedTable(tableId);
    } else if (tablesWithRelationships.length > 0 && !selectedTable) {
      setSelectedTable(tablesWithRelationships[0]);
    }
  }, [tableId, tablesWithRelationships]);

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
              {table} ({relationshipCounts[table] || 0})
            </MenuItem>
          ))}
        </Select>
      ),
    });
  }

  let contentDom: JSX.Element;
  if (!databaseId) {
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
