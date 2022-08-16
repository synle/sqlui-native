import SsidChartIcon from '@mui/icons-material/SsidChart';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ReactFlow from 'react-flow-renderer';
import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useGetAllTableColumns } from 'src/frontend/hooks/useConnection';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';

type MyNode = any;
type MyEdge = any;

export default function RelationshipChartPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const databaseId = urlParams.databaseId as string;

  const [nodes, setNodes] = useState<MyNode[]>([]);
  const [edges, setEdges] = useState<MyEdge[]>([]);
  const [showLabels, setShowLabels] = useState(false);

  const { data, isLoading } = useGetAllTableColumns(connectionId, databaseId);

  const onToggleShowLabels = () => setShowLabels(!showLabels);

  useEffect(() => {
    if (!data) {
      return;
    }

    const newNodes: MyNode[] = [];
    const newEdges: MyEdge[] = [];

    const width = 200;
    const widthDelta = 100;
    const height = 25;
    const heightDelta = 100;

    const mapNodeConnectionsCount: Record<string, number> = {}; // connection => count

    let i = 0;
    for (const tableName of Object.keys(data)) {
      newNodes.push({
        id: tableName,
        data: { label: tableName },
        connectable: false,
        position: { x: width * 3 + widthDelta * 3, y: i * height + i * heightDelta },
      });

      i++;
    }

    for (const tableName of Object.keys(data)) {
      const tableColumns = data[tableName];

      for (const tableColumn of tableColumns) {
        if (tableColumn.referencedColumnName && tableColumn.referencedTableName) {
          const foundEdge = newEdges.find(
            (edge) => edge.source === tableName && edge.target === tableColumn.referencedTableName,
          );

          newEdges.push({
            id: `${tableName}.${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
            source: tableName,
            target: tableColumn.referencedTableName,
            label: !showLabels
              ? undefined
              : `${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
            type: 'straight',
          });

          mapNodeConnectionsCount[tableColumn.referencedTableName] =
            mapNodeConnectionsCount[tableColumn.referencedTableName] || 0;
          mapNodeConnectionsCount[tableColumn.referencedTableName]++;
        }
      }
    }

    const countGroups = [...new Set(Object.values(mapNodeConnectionsCount))]
      .map((s) => s as number)
      .sort((a, b) => b - a);
    const [firstGroup, secondGroup, thirdGroup] = countGroups;

    for (const node of newNodes) {
      const tableName = node.id;
      const count = mapNodeConnectionsCount[tableName];

      if (count === firstGroup) {
        node.position.x = width * 0 + widthDelta * 0;
      } else if (count === secondGroup) {
        node.position.x = width * 1 + widthDelta * 1;
      } else if (count === thirdGroup) {
        node.position.x = width * 2 + widthDelta * 2;
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [JSON.stringify(data), showLabels]);

  if (isLoading) {
    return <Box sx={{ padding: 2 }}>Loading...</Box>;
  }

  return (
    <>
      <Box sx={{ mx: 2, display: 'flex', alignItems: 'center' }}>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <SsidChartIcon fontSize='inherit' />
                  Visualization
                </>
              ),
            },
          ]}
        />
        <Box sx={{ ml: 'auto' }}>
          <Button onClick={onToggleShowLabels}>{showLabels ? 'Hide Labels' : 'Show Labels'}</Button>
        </Box>
      </Box>
      <Box sx={{ height: '100vh', zIndex: 0 }}>
        <ReactFlow defaultNodes={nodes} defaultEdges={edges} fitView />
      </Box>
    </>
  );
}
