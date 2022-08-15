import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useRef } from 'react';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import AppHeader from 'src/frontend/components/AppHeader';
import ElectronEventListener from 'src/frontend/components/ElectronEventListener';
import MissionControl, { useCommands } from 'src/frontend/components/MissionControl';
import SessionManager from 'src/frontend/components/SessionManager';
import dataApi from 'src/frontend/data/api';
import {
  useGetCurrentSession,
  useGetSessions,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import { useDarkModeSetting } from 'src/frontend/hooks/useSetting';
import useToaster, { ToasterHandler } from 'src/frontend/hooks/useToaster';
import BookmarksPage from 'src/frontend/views/BookmarksPage';
import EditConnectionPage from 'src/frontend/views/EditConnectionPage';
import MainPage from 'src/frontend/views/MainPage';
import MigrationPage from 'src/frontend/views/MigrationPage';
import NewConnectionPage from 'src/frontend/views/NewConnectionPage';
import { NewRecordPage } from 'src/frontend/views/RecordPage';
import RecycleBinPage from 'src/frontend/views/RecycleBinPage';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';
import { useParams } from 'react-router-dom';


import {useEffect, useState} from 'react'
import ReactFlow from 'react-flow-renderer';
import { useGetAllTableColumns } from 'src/frontend/hooks/useConnection';

type MyNode = any;
type MyEdge = any;

export default function RelationshipChartPage(){
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const databaseId = urlParams.databaseId as string;

  const [nodes, setNodes] = useState<MyNode[]>([]);
  const [edges, setEdges] = useState<MyEdge[]>([]);

  const {
    data,
    isLoading,
  } = useGetAllTableColumns(connectionId, databaseId);

  useEffect(() => {
    if(!data){
      return ;
    }

    const newNodes : MyNode[]= [];
    const newEdges : MyEdge[] = [];

    const width = 200;
    const widthDelta = 100;
    const height = 25;
    const heightDelta = 100;

    const mapNodeConnectionsCount : Record<string, number>= {}; // connection => count

    let i = 0;
    for(const tableName of Object.keys(data)){
      newNodes.push({
        id: tableName,
        data: { label: tableName },
        connectable: false,
        position: { x: width * 3 +  widthDelta *  3, y: i * height + i * heightDelta},
      })

      i++;
    }

    for(const tableName of Object.keys(data)){
      const tableColumns = data[tableName];

      for(const tableColumn of tableColumns){
        if(tableColumn.referencedColumnName && tableColumn.referencedTableName){
          const foundEdge = newEdges.find(edge => edge.source === tableName && edge.target === tableColumn.referencedTableName)

          newEdges.push({
            id: `${tableName}.${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
            source: tableName,
            target: tableColumn.referencedTableName,
            // label: `${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
            type: 'straight'
          })

          mapNodeConnectionsCount[tableColumn.referencedTableName] = mapNodeConnectionsCount[tableColumn.referencedTableName] || 0;
          mapNodeConnectionsCount[tableColumn.referencedTableName]++;
        }
      }
    }

    const countGroups = [...new Set(Object.values(mapNodeConnectionsCount))].map(s => (s as number)).sort((a,b) => b - a);
    const [firstGroup, secondGroup, thirdGroup] = countGroups;

    for(const node of newNodes){
      const tableName = node.id;
      const count = mapNodeConnectionsCount[tableName];

      if(count === firstGroup){
        node.position.x = width * 0 +  widthDelta *  0
      } else if(count === secondGroup) {
        node.position.x = width * 1 +  widthDelta *  1
      } else if(count === thirdGroup) {
        node.position.x = width * 2 +  widthDelta *  2
      }
    }

    setNodes(newNodes)
    setEdges(newEdges)
  }, [JSON.stringify(data)])

  if(isLoading){
    return <Box sx={{padding: 2}}>Loading...</Box>
  }

  return <div style={{height: 'calc(100vh - 50px)'}}>
    <ReactFlow defaultNodes={nodes} defaultEdges={edges} fitView />
  </div>;
}
