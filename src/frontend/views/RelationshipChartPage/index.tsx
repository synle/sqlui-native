import SsidChartIcon from '@mui/icons-material/SsidChart';
import Backdrop from '@mui/material/Backdrop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { toPng } from 'html-to-image';
import ReactFlow from 'react-flow-renderer';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import { downloadBlob } from 'src/frontend/data/file';
import { useGetAllTableColumns, useGetConnectionById, useGetColumns, useGetDatabases } from 'src/frontend/hooks/useConnection';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';
import { useNavigate } from 'react-router-dom';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

type MyNode = any;
type MyEdge = any;

const width = 200;
const widthDelta = 10;
const height = 80;
const heightDelta = 25;

export default function RelationshipChartPage() {
  const navigate = useNavigate();
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const databaseId = urlParams.databaseId as string;
  const tableId = urlParams.tableId as string;

  const [nodes, setNodes] = useState<MyNode[]>([]);
  const [edges, setEdges] = useState<MyEdge[]>([]);
  const [showLabels, setShowLabels] = useState(false);

  const {
    data: connection,
    refetch: refetchConnection,
    error: errorConnection,
    isLoading: loadingConnection,
  } = useGetConnectionById(connectionId);

  const {
    data: databases,
    refetch: refetchDatabases,
    error: errorDatabases,
    isLoading: loadingDatabases,
  } = useGetDatabases(connectionId);

  const {
    data: allColumns,
    refetch: refetchAllColumns,
    error: errorAllColumns,
    isLoading: loadingAllColumns,
  } = useGetAllTableColumns(connectionId, databaseId);

  const {
    refetch: refetchActiveTableColumns,
    error: errorActiveTableColumns,
    isLoading: loadingActiveTableColumns
  } = useGetColumns(
    connectionId, databaseId, tableId
  );

  const onToggleShowLabels = () => setShowLabels(!showLabels);

  const onDownload = async () => {
    const node = document.querySelector('#relationship-chart') as HTMLElement;
    const blob = await toPng(node);
    await downloadBlob(`relationship-${connectionId}-${databaseId}-${new Date()}.png`, blob);
  };

  const isLoading = loadingAllColumns || loadingConnection || loadingActiveTableColumns || loadingDatabases;
  const hasError = errorAllColumns || errorConnection || errorActiveTableColumns || errorDatabases;

  useEffect(() => {
    setNodes([])
    setEdges([])

    refetchConnection();
    refetchAllColumns();
    refetchActiveTableColumns();
    refetchDatabases();
  }, [connectionId, databaseId, tableId])

  useEffect(() => {
    if (!allColumns) {
      return;
    }

    let newNodes: MyNode[] = [];
    let newEdges: MyEdge[] = [];

    const mapNodeConnectionsCount: Record<string, number> = {}; // connection => count
    const nodesHasEdge = new Set<string>();

    for (const tableName of Object.keys(allColumns)) {
      newNodes.push({
        id: tableName,
        data: { label: tableName },
        connectable: false,
        position: { x: 0, y: 0 },
      });
    }

    for (const tableName of Object.keys(allColumns).sort()) {
      const tableColumns = allColumns[tableName];

      for (const tableColumn of tableColumns) {
        if (tableColumn.referencedColumnName && tableColumn.referencedTableName) {
          const foundEdge = newEdges.find(
            (edge) => edge.source === tableName && edge.target === tableColumn.referencedTableName,
          );

          const newEdge = {
            _label: `${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
            id: `${tableName}.${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
            source: tableName, // from
            target: tableColumn.referencedTableName, // to
            type: 'straight',
          };

          nodesHasEdge.add(newEdge.source);
          nodesHasEdge.add(newEdge.target);

          newEdges.push(newEdge);
        }
      }
    }

    // here we will filter out all the nodes and edges that doesn't have tableId
    if(tableId){
      newEdges = newEdges.filter(edge => edge.source === tableId || edge.target === tableId)

      const nodesToKeep = new Set([tableId]);
      for(const edge of newEdges){
        nodesToKeep.add(edge.source);
        nodesToKeep.add(edge.target);
      }

      newNodes = newNodes.filter(node => nodesToKeep.has(node.id));
    }

    // doing the count for grouping of nodes
    for(const edge of newEdges){
      mapNodeConnectionsCount[edge.target] =
        mapNodeConnectionsCount[edge.target] || 0;
      mapNodeConnectionsCount[edge.target]++;
    }

    const countGroups = [...new Set(Object.values(mapNodeConnectionsCount))]
      .map((s) => s as number)
      .sort((a, b) => b - a);

    let i = 0;
    for (const node of newNodes) {
      const tableName = node.id;
      const count = mapNodeConnectionsCount[tableName];

      let foundIdx = countGroups.indexOf(count);
      if (foundIdx === -1) {
        if (nodesHasEdge.has(tableName)) {
          // node that has some edges, then show them at second to last
          // row
          foundIdx = countGroups.length;
        } else {
          // these are nodes that doesn't have any dependency
          // show them at the bottom
          foundIdx = countGroups.length + 1;
        }
      }

      const colIdx = i++;
      const rowIdx = foundIdx;
      node.position.x = width * colIdx + widthDelta * colIdx;
      node.position.y = height * rowIdx + heightDelta * rowIdx;
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [connectionId, databaseId, tableId, JSON.stringify(allColumns)]);

  // show or hide labels
  useEffect(() => {
    setEdges(
      edges.map((edge) => {
        edge.label = showLabels ? edge._label : undefined;
        return edge;
      }),
    );
  }, [showLabels]);

  if (isLoading) {
    return (
      <Backdrop
        open={true}
        sx={{
          bgcolor: 'background.paper',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}>
        <CircularProgress />
        <Typography variant='h6' sx={{ ml: 2 }}>
          Loading Visualization...
        </Typography>
      </Backdrop>
    );
  }

  if (hasError) {
    return (
      <Typography variant='h6' sx={{ mx: 4, mt: 2, color: 'error.main' }}>
        There are some errors because we can't fetch the related connection or columns in this
        table.
      </Typography>
    );
  }

  const breadcrumbsData = [
    {
      label: (
        <>
          <SsidChartIcon fontSize='inherit' />
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

  if(tableId){
    breadcrumbsData.push({
      label:<>{tableId}</>
    });
  }

  let contentDom : JSX.Element;
  if(!databaseId){
    // here we show a list of database ids to let you select
    if(databases && databases.length > 0){
      contentDom = <>
      <Typography variant='h6' sx={{ mx: 2}}>
      Select one of the following database to visualize
      </Typography>
      <List>
      {databases.map((database) => {
        const onNavigateToDatabaseVisualization = () => {
          navigate(`/visualization/${connectionId}/${database.name}`)
        }

        return <ListItem disablePadding>
            <ListItemButton onClick={onNavigateToDatabaseVisualization}>
              <ListItemText primary={database.name} />
            </ListItemButton>
          </ListItem>
      })}
        </List>
        </>
    } else {
      contentDom = <Typography variant='h6' sx={{ mx:2, color: 'error.main' }}>This connection doesn't have any database</Typography>
    }

  } else {
    contentDom  = <Box id='relationship-chart' sx={{ height: 'calc(100vh - 110px)', zIndex: 0 }}>
        <ReactFlow
          fitView
          snapToGrid
          defaultNodes={nodes}
          defaultEdges={edges}
          onNodesChange={(nodeChanges) => {
            let newNodes = nodes;
            let newEdges = edges;

            for (const nodeChange of nodeChanges) {
              //@ts-ignore
              const targetNodeId = nodeChange.id;

              if (!targetNodeId) {
                continue;
              }

              switch (nodeChange.type) {
                case 'select':
                  newNodes = newNodes.map((node) => {
                    if (node.id === targetNodeId) {
                      node.selected = nodeChange.selected;
                    }

                    return node;
                  });
                  break;
                case 'remove':
                  newNodes = newNodes.filter((node) => {
                    return node.id !== targetNodeId;
                  });
                  break;
                default:
                case 'dimensions':
                  break;
              }
            }

            const selectedNodes = new Set<string>();
            for (const node of newNodes) {
              if (node.selected) {
                selectedNodes.add(node.id);
              }
            }

            // handling path highlights
            // animate edges for selected node
            newEdges = newEdges.map((edge) => {
              if (selectedNodes.has(edge.source) || selectedNodes.has(edge.target)) {
                edge.animated = true;
              } else {
                edge.animated = false;
              }
              return edge;
            });

            setNodes(newNodes);
            setEdges(newEdges);
          }}
          onNodeDragStop={(e, targetNode) => {
            setNodes(
              nodes.map((node) => {
                if (node.id === targetNode.id) {
                  node.position = targetNode.position;
                }
                return node;
              }),
            );
          }}
        />
      </Box>
  }

  return (
    <>
      <Box sx={{ mx: 2, display: 'flex', alignItems: 'center' }}>
        <Breadcrumbs
          links={breadcrumbsData}
        />
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button onClick={onToggleShowLabels}>{showLabels ? 'Hide Labels' : 'Show Labels'}</Button>
          <Button onClick={onDownload}>Download</Button>
        </Box>
      </Box>
      {contentDom}
    </>
  );
}
