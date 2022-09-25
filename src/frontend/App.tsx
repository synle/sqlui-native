import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useEffect, useRef } from 'react';
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
import RelationshipChartPage from 'src/frontend/views/RelationshipChartPage';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';

export default function App() {
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const colorMode = useDarkModeSetting();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const toasterRef = useRef<ToasterHandler | undefined>();

  // @ts-ignore
  const globalMonaco = window.monaco;
  useEffect(() => {
    if(globalMonaco){
      // disable auto complete  popup
      // https://stackoverflow.com/questions/41581570/how-to-remove-autocompletions-for-monaco-editor-using-javascript
      // @ts-ignore
      globalMonaco.languages.typescript.javascriptDefaults.setCompilerOptions({ noLib: true, allowNonTsExtensions: true });
    }
  },
  // @ts-ignore
  [globalMonaco]);

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
              <Route
                path='/'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <MainPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/connection/new'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <NewConnectionPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/connection/edit/:connectionId'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <EditConnectionPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/migration/real_connection'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <MigrationPage mode='real_connection' />
                    </section>
                  </>
                }
              />
              <Route
                path='/migration/raw_json'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <MigrationPage mode='raw_json' />
                    </section>
                  </>
                }
              />
              <Route
                path='/migration'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <MigrationPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/recycle_bin'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <RecycleBinPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/bookmarks'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <BookmarksPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/record/new'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <NewRecordPage />
                    </section>
                  </>
                }
              />
              <Route
                path='/visualization/:connectionId'
                element={
                  <>
                    <AppHeader />
                    <RelationshipChartPage />
                  </>
                }
              />
              <Route
                path='/visualization/:connectionId/:databaseId'
                element={
                  <>
                    <AppHeader />
                    <RelationshipChartPage />
                  </>
                }
              />
              <Route
                path='/visualization/:connectionId/:databaseId/:tableId'
                element={
                  <>
                    <AppHeader />
                    <RelationshipChartPage />
                  </>
                }
              />
              <Route
                path='/relationship/:connectionId/:databaseId/:tableId'
                element={
                  <>
                    <AppHeader />
                    <RelationshipChartPage />
                  </>
                }
              />
              <Route
                path='/*'
                element={
                  <>
                    <AppHeader />
                    <section className='App__Section'>
                      <MainPage />
                    </section>
                  </>
                }
              />
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
