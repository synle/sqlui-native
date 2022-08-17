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
import { useGetAllTableColumns, useGetConnectionById } from 'src/frontend/hooks/useConnection';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';

type MyNode = any;

type MyEdge = any;

const width = 200;

const widthDelta = 10;
const height = 80;
const heightDelta = 25;

export default function RelationshipChartPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const databaseId = urlParams.databaseId as string;
  const tableId = urlParams.tableId as string;

  const [nodes, setNodes] = useState<MyNode[]>([]);
  const [edges, setEdges] = useState<MyEdge[]>([]);
  const [showLabels, setShowLabels] = useState(false);

  const {
    data,
    error: errorAllColumns,
    isLoading: loadingAllColumns,
  } = useGetAllTableColumns(connectionId, databaseId);
  const {
    data: connection,
    error: errorConnection,
    isLoading: loadingConnection,
  } = useGetConnectionById(connectionId);

  const onToggleShowLabels = () => setShowLabels(!showLabels);

  const onDownload = async () => {
    const node = document.querySelector('#relationship-chart') as HTMLElement;
    const blob = await toPng(node);
    await downloadBlob(`relationship-${connectionId}-${databaseId}-${new Date()}.png`, blob);
  };

  const isLoading = loadingAllColumns || loadingConnection;

  useEffect(() => {
    if (!data) {
      return;
    }

    let newNodes: MyNode[] = [];
    let newEdges: MyEdge[] = [];

    const mapNodeConnectionsCount: Record<string, number> = {}; // connection => count
    const nodesHasEdge = new Set<string>();

    for (const tableName of Object.keys(data)) {
      newNodes.push({
        id: tableName,
        data: { label: tableName },
        connectable: false,
        position: { x: 0, y: 0 },
      });
    }

    for (const tableName of Object.keys(data).sort()) {
      const tableColumns = data[tableName];

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

          mapNodeConnectionsCount[tableColumn.referencedTableName] =
            mapNodeConnectionsCount[tableColumn.referencedTableName] || 0;
          mapNodeConnectionsCount[tableColumn.referencedTableName]++;

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
  }, [JSON.stringify(data)]);

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

  const hasError = errorAllColumns || errorConnection;
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
    },
    {
      label: <>{databaseId}</>,
    },
  ];

  if(tableId){
    breadcrumbsData.push({
      label:<>{tableId}</>
    });
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
      <Box id='relationship-chart' sx={{ height: 'calc(100vh - 110px)', zIndex: 0 }}>
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
    </>
  );
}
