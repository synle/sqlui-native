import Box from '@mui/material/Box';
import { createTheme } from '@mui/material/styles';
import { Route, Routes } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import AppHeader from 'src/frontend/components/AppHeader';
import MissionControl, { useCommands } from 'src/frontend/components/MissionControl';
import SessionManager from 'src/frontend/components/SessionManager';
import dataApi from 'src/frontend/data/api';
import {
  useGetCurrentSession,
  useGetSessions,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import { useAnimationModeSetting, useDarkModeSetting } from 'src/frontend/hooks/useSetting';
import useToaster, { ToasterHandler } from 'src/frontend/hooks/useToaster';
import BookmarksPage from 'src/frontend/views/BookmarksPage';
import EditConnectionPage from 'src/frontend/views/EditConnectionPage';
import MainPage from 'src/frontend/views/MainPage';
import MigrationPage from 'src/frontend/views/MigrationPage';
import NewConnectionPage from 'src/frontend/views/NewConnectionPage';
import { NewRecordPage } from 'src/frontend/views/RecordPage';
import RecycleBinPage from 'src/frontend/views/RecycleBinPage';
import RelationshipChartPage from 'src/frontend/views/RelationshipChartPage';

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <section className='App__Section'>{children}</section>
    </>
  );
}

export default function App() {
  const { data: sessions, isLoading: loadingSessions } = useGetSessions();
  const { data: currentSession, isLoading: loadingCurrentSession } = useGetCurrentSession();
  const { mutateAsync: upsertSession } = useUpsertSession();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const toasterRef = useRef<ToasterHandler | undefined>();

  // @ts-ignore
  const globalMonaco = window.monaco;
  useEffect(() => {
    if (globalMonaco) {
      // disable auto complete  popup
      // https://stackoverflow.com/questions/41581570/how-to-remove-autocompletions-for-monaco-editor-using-javascript

      globalMonaco.languages.typescript.javascriptDefaults.setCompilerOptions({
        noLib: true,
        allowNonTsExtensions: true,
      });
    }
  }, [globalMonaco]);
  const myTheme = createTheme({
    // Theme settings
    palette: {
      mode: useDarkModeSetting(),
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

      const file = files[0];
      if (!file) {
        await toasterRef.current?.dismiss();
        toasterRef.current = undefined;
        return;
      }
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
    <>
      <SessionManager>
        <Box className='App' data-animation={useAnimationModeSetting() ? 'on' : 'off'} onDrop={onDrop} onDragOver={onDragOver}>
          <Routes>
            <Route
              path='/'
              element={
                <PageLayout>
                  <MainPage />
                </PageLayout>
              }
            />
            <Route
              path='/connection/new'
              element={
                <PageLayout>
                  <NewConnectionPage />
                </PageLayout>
              }
            />
            <Route
              path='/connection/edit/:connectionId'
              element={
                <PageLayout>
                  <EditConnectionPage />
                </PageLayout>
              }
            />
            <Route
              path='/migration/real_connection'
              element={
                <PageLayout>
                  <MigrationPage mode='real_connection' />
                </PageLayout>
              }
            />
            <Route
              path='/migration/raw_json'
              element={
                <PageLayout>
                  <MigrationPage mode='raw_json' />
                </PageLayout>
              }
            />
            <Route
              path='/migration'
              element={
                <PageLayout>
                  <MigrationPage />
                </PageLayout>
              }
            />
            <Route
              path='/recycle_bin'
              element={
                <PageLayout>
                  <RecycleBinPage />
                </PageLayout>
              }
            />
            <Route
              path='/bookmarks'
              element={
                <PageLayout>
                  <BookmarksPage />
                </PageLayout>
              }
            />
            <Route
              path='/record/new'
              element={
                <PageLayout>
                  <NewRecordPage />
                </PageLayout>
              }
            />
            <Route
              path='/visualization/:connectionId'
              element={
                <PageLayout>
                  <RelationshipChartPage />
                </PageLayout>
              }
            />
            <Route
              path='/visualization/:connectionId/:databaseId'
              element={
                <PageLayout>
                  <RelationshipChartPage />
                </PageLayout>
              }
            />
            <Route
              path='/visualization/:connectionId/:databaseId/:tableId'
              element={
                <PageLayout>
                  <RelationshipChartPage />
                </PageLayout>
              }
            />
            <Route
              path='/relationship/:connectionId/:databaseId/:tableId'
              element={
                <PageLayout>
                  <RelationshipChartPage />
                </PageLayout>
              }
            />
          </Routes>
        </Box>
        <MissionControl />
      </SessionManager>
    </>
  );
}
