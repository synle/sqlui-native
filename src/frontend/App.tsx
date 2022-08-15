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


import {useEffect, useState} from 'react'
import ReactFlow from 'react-flow-renderer';


export default function App() {
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const colorMode = useDarkModeSetting();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const toasterRef = useRef<ToasterHandler | undefined>();

  const myTheme = createTheme({
    // Theme settings
    palette: {
      mode: colorMode,
    },
    components: {
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
    },
  });

  const onDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.items && e.dataTransfer.items.length === 1) {
      e.preventDefault();

      await toasterRef.current?.dismiss();

      toasterRef.current = await addToast({
        message: `Parsing the file for importing, please wait...`,
      });

      // TODO: right now only support one file for drop...
      const files = [...e.dataTransfer.items]
        .map((item) => item.getAsFile())
        .filter((f) => f) as File[];

      //@ts-ignore
      const file = files[0];
      if (file.type === 'application/json') {
        selectCommand({ event: 'clientEvent/import', data: await dataApi.readFileContent(file) });
      } else {
        await addToast({
          message: `File not supported for import. Only application/json file type is supported.`,
        });
      }

      await toasterRef.current?.dismiss();
      toasterRef.current = undefined;
    }
  };

  const onDragOver = async (e: React.DragEvent) => {
    if (e.dataTransfer.items && e.dataTransfer.items.length === 1) {
      e.preventDefault();

      if (!toasterRef.current) {
        toasterRef.current = await addToast({
          message: `Drop the file here to upload and import it.`,
        });
      }
    }
  };

  return (
    <ThemeProvider theme={myTheme}>
      <HashRouter>
        <SessionManager>
          <Box
            className='App'
            sx={{
              bgcolor: 'background.default',
              color: 'text.primary',
            }}
            onDrop={onDrop}
            onDragOver={onDragOver}>
              <Routes>
                <Route path='/' element={<><AppHeader /><section className='App__Section'><MainPage /></section></>} />
                <Route path='/connection/new' element={<><AppHeader /><section className='App__Section'><NewConnectionPage /></section></>} />
                <Route path='/connection/edit/:connectionId' element={<><AppHeader /><section className='App__Section'><EditConnectionPage /></section></>} />
                <Route
                  path='/migration/real_connection'
                  element={<><AppHeader /><section className='App__Section'><MigrationPage mode='real_connection' /></section></>}
                />
                <Route path='/migration/raw_json' element={<><AppHeader /><section className='App__Section'><MigrationPage mode='raw_json' /></section></>} />
                <Route path='/migration' element={<><AppHeader /><section className='App__Section'><MigrationPage /></section></>} />
                <Route path='/recycle_bin' element={<><AppHeader /><section className='App__Section'><RecycleBinPage /></section></>} />
                <Route path='/bookmarks' element={<><AppHeader /><section className='App__Section'><BookmarksPage /></section></>} />
                <Route path='/record/new' element={<><AppHeader /><section className='App__Section'><NewRecordPage /></section></>} />
                <Route path='/relationship' element={<><RelationshipChart /></>} />
                <Route path='/*' element={<><AppHeader /><section className='App__Section'><MainPage /></section></>} />
              </Routes>
          </Box>
          <MissionControl />
        </SessionManager>
        <ActionDialogs />
      </HashRouter>
      <ElectronEventListener />
    </ThemeProvider>
  );
}


type MyNode = any;
type MyEdge = any;

function RelationshipChart(){
  const [nodes, setNodes] = useState<MyNode[]>([]);
  const [edges, setEdges] = useState<MyEdge[]>([]);

  var data = {
    promo_codes: [{"name":"code","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"creation_time","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"description","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"expiration_time","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"rules","type":"JSONB","allowNull":true,"defaultValue":null,"comment":null,"special":[]}],
    user_promo_codes: [{"name":"city","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true,"kind":"foreign_key","referencedTableName":"users","referencedColumnName":"id"},{"name":"code","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"user_id","type":"UUID","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true,"kind":"foreign_key","referencedTableName":"users","referencedColumnName":"id"},{"name":"timestamp","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"usage_count","type":"BIGINT","allowNull":true,"defaultValue":null,"comment":null,"special":[]}],
    users: [{"name":"city","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"id","type":"UUID","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"address","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"credit_card","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"name","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]}],
    vehicles: [{"name":"city","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true,"kind":"foreign_key","referencedTableName":"users","referencedColumnName":"id"},{"name":"id","type":"UUID","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"creation_time","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"current_location","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"ext","type":"JSONB","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"owner_id","type":"UUID","allowNull":true,"defaultValue":null,"comment":null,"special":[],"kind":"foreign_key","referencedTableName":"users","referencedColumnName":"id"},{"name":"status","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"type","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]}],
    rides: [{"name":"city","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true,"kind":"foreign_key","referencedTableName":"users","referencedColumnName":"id"},{"name":"id","type":"UUID","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"end_address","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"end_time","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"revenue","type":"NUMERIC","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"rider_id","type":"UUID","allowNull":true,"defaultValue":null,"comment":null,"special":[],"kind":"foreign_key","referencedTableName":"users","referencedColumnName":"id"},{"name":"start_address","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"start_time","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"vehicle_city","type":"CHARACTER VARYING","allowNull":true,"defaultValue":null,"comment":null,"special":[],"kind":"foreign_key","referencedTableName":"vehicles","referencedColumnName":"id"},{"name":"vehicle_id","type":"UUID","allowNull":true,"defaultValue":null,"comment":null,"special":[],"kind":"foreign_key","referencedTableName":"vehicles","referencedColumnName":"id"}],
    vehicle_location_histories: [{"name":"city","type":"CHARACTER VARYING","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true,"kind":"foreign_key","referencedTableName":"rides","referencedColumnName":"id"},{"name":"ride_id","type":"UUID","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true,"kind":"foreign_key","referencedTableName":"rides","referencedColumnName":"id"},{"name":"timestamp","type":"TIMESTAMP WITHOUT TIME ZONE","allowNull":false,"defaultValue":null,"comment":null,"special":[],"primaryKey":true},{"name":"lat","type":"DOUBLE PRECISION","allowNull":true,"defaultValue":null,"comment":null,"special":[]},{"name":"long","type":"DOUBLE PRECISION","allowNull":true,"defaultValue":null,"comment":null,"special":[]}],
  }

  // const initialNodes = [
  //   {
  //     id: '1',
  //     type: 'input',
  //     data: { label: 'Input Node' },
  //     position: { x: 250, y: 25 },
  //   },

  //   {
  //     id: '2',
  //     // you can also pass a React component as a label
  //     data: { label: <div>Default Node</div> },
  //     position: { x: 100, y: 125 },
  //   },
  //   {
  //     id: '3',
  //     type: 'output',
  //     data: { label: 'Output Node' },
  //     position: { x: 250, y: 250 },
  //   },
  // ];

  // const initialEdges = [
  //   { id: 'e1-2', source: '1', target: '2' },
  //   { id: 'e2-3', source: '2', target: '3', animated: true },
  // ];

  useEffect(() => {
    const newNodes : MyNode[]= [];
    const newEdges : MyEdge[] = [];

    const mapNodeConnectionsCount : any= {}; // connection => count

    let i = 0;
    for(const tableName of Object.keys(data)){
      newNodes.push({
        id: tableName,
        data: { label: tableName },
        connectable: false,
        position: { x: 10, y: i * 25 + i * 100},
      })

      i++;
    }

    for(const tableName of Object.keys(data)){
      const tableColumns = data[tableName];

      for(const tableColumn of tableColumns){
        if(tableColumn.referencedColumnName && tableColumn.referencedTableName){
          const foundEdge = newEdges.find(edge => edge.source === tableName && edge.target === tableColumn.referencedTableName)

          if(foundEdge){
            foundEdge.label += `, ${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`
          } else {
            newEdges.push({
              id: `${tableName}.${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
              source: tableName,
              target: tableColumn.referencedTableName,
              label: `${tableColumn.name} => ${tableColumn.referencedTableName}.${tableColumn.referencedColumnName}`,
              type: 'straight'
            })
          }

          mapNodeConnectionsCount[tableColumn.referencedTableName] = mapNodeConnectionsCount[tableColumn.referencedTableName] || 0;
          mapNodeConnectionsCount[tableColumn.referencedTableName]++;
        }
      }
    }

    const countGroups = [...new Set(Object.values(mapNodeConnectionsCount))];
    debugger

    setNodes(newNodes)
    setEdges(newEdges)
  }, [JSON.stringify(data)])

  return <div style={{position: 'fixed', top: 0, left: 0, bottom: 0, right: 0, zIndex: 1}}>
    <ReactFlow defaultNodes={nodes} defaultEdges={edges} fitView />
  </div>;
}
