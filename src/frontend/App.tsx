import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { Route, Routes } from "react-router";
import { Suspense, lazy, useEffect, useRef } from "react";
import AppHeader from "src/frontend/components/AppHeader";
import MissionControl, { useCommands } from "src/frontend/components/MissionControl";
import SessionManager from "src/frontend/components/SessionManager";
import dataApi from "src/frontend/data/api";
import { useGetSessions } from "src/frontend/hooks/useSession";
import useToaster, { ToasterHandler } from "src/frontend/hooks/useToaster";
import { monaco } from "src/frontend/monacoSetup";

/** Lazy-loaded route pages for code splitting. */
const BookmarksPage = lazy(() => import("src/frontend/views/BookmarksPage"));
const EditConnectionPage = lazy(() => import("src/frontend/views/EditConnectionPage"));
const MainPage = lazy(() => import("src/frontend/views/MainPage"));
const MigrationPage = lazy(() => import("src/frontend/views/MigrationPage"));
const NewConnectionPage = lazy(() => import("src/frontend/views/NewConnectionPage"));
const NewRecordPage = lazy(() => import("src/frontend/views/RecordPage").then((m) => ({ default: m.NewRecordPage })));
const QueryHistoryPage = lazy(() => import("src/frontend/views/QueryHistoryPage"));
const RecycleBinPage = lazy(() => import("src/frontend/views/RecycleBinPage"));
const RelationshipChartPage = lazy(() => import("src/frontend/views/RelationshipChartPage"));

function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppHeader />
      <section className="App__Section">{children}</section>
    </>
  );
}

/**
 * Main application component. Handles routing, drag-and-drop import, and Monaco editor configuration.
 */
export default function App() {
  useGetSessions();
  const { selectCommand } = useCommands();
  const { add: addToast } = useToaster();
  const toasterRef = useRef<ToasterHandler | undefined>(undefined);

  useEffect(() => {
    // Disable auto complete popup for TypeScript/JavaScript
    // https://stackoverflow.com/questions/41581570/how-to-remove-autocompletions-for-monaco-editor-using-javascript
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      noLib: true,
      allowNonTsExtensions: true,
    });
  }, []);

  const onDrop = async (e: React.DragEvent) => {
    if (e.dataTransfer.items && e.dataTransfer.items.length === 1) {
      e.preventDefault();

      await toasterRef.current?.dismiss();

      toasterRef.current = await addToast({
        message: `Parsing the file for importing, please wait...`,
      });

      // TODO: right now only support one file for drop...
      const files = [...e.dataTransfer.items].map((item) => item.getAsFile()).filter((f) => f) as File[];

      const file = files[0];
      if (!file) {
        await toasterRef.current?.dismiss();
        toasterRef.current = undefined;
        return;
      }
      if (file.type === "application/json") {
        selectCommand({
          event: "clientEvent/import",
          data: await dataApi.readFileContent(file),
        });
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
        <Box className="App" onDrop={onDrop} onDragOver={onDragOver}>
          <Suspense fallback={<CircularProgress sx={{ margin: "auto" }} />}>
            <Routes>
              <Route
                path="/"
                element={
                  <PageLayout>
                    <MainPage />
                  </PageLayout>
                }
              />
              <Route
                path="/connection/new"
                element={
                  <PageLayout>
                    <NewConnectionPage />
                  </PageLayout>
                }
              />
              <Route
                path="/connection/edit/:connectionId"
                element={
                  <PageLayout>
                    <EditConnectionPage />
                  </PageLayout>
                }
              />
              <Route
                path="/migration/real_connection"
                element={
                  <PageLayout>
                    <MigrationPage mode="real_connection" />
                  </PageLayout>
                }
              />
              <Route
                path="/migration/raw_json"
                element={
                  <PageLayout>
                    <MigrationPage mode="raw_json" />
                  </PageLayout>
                }
              />
              <Route
                path="/migration"
                element={
                  <PageLayout>
                    <MigrationPage />
                  </PageLayout>
                }
              />
              <Route
                path="/query_history"
                element={
                  <PageLayout>
                    <QueryHistoryPage />
                  </PageLayout>
                }
              />
              <Route
                path="/recycle_bin"
                element={
                  <PageLayout>
                    <RecycleBinPage />
                  </PageLayout>
                }
              />
              <Route
                path="/bookmarks"
                element={
                  <PageLayout>
                    <BookmarksPage />
                  </PageLayout>
                }
              />
              <Route
                path="/record/new"
                element={
                  <PageLayout>
                    <NewRecordPage />
                  </PageLayout>
                }
              />
              <Route
                path="/visualization/:connectionId"
                element={
                  <PageLayout>
                    <RelationshipChartPage />
                  </PageLayout>
                }
              />
              <Route
                path="/visualization/:connectionId/:databaseId"
                element={
                  <PageLayout>
                    <RelationshipChartPage />
                  </PageLayout>
                }
              />
              <Route
                path="/visualization/:connectionId/:databaseId/:tableId"
                element={
                  <PageLayout>
                    <RelationshipChartPage />
                  </PageLayout>
                }
              />
              <Route
                path="/relationship/:connectionId/:databaseId/:tableId"
                element={
                  <PageLayout>
                    <RelationshipChartPage />
                  </PageLayout>
                }
              />
            </Routes>
          </Suspense>
        </Box>
        <MissionControl />
      </SessionManager>
    </>
  );
}
