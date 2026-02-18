import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { SnackbarProvider } from "notistack";
import ReactDOM from "react-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HashRouter, Route, Routes } from "react-router-dom";
import React from "react";
import App from "src/frontend/App";
import ActionDialogs from "src/frontend/components/ActionDialogs";
import ElectronEventListener from "src/frontend/components/ElectronEventListener";
import DataSnapshotListView from "src/frontend/DataSnapshotListView";
import DataSnapshotView from "src/frontend/DataSnapshotView";
import ActionDialogsContextProvider from "src/frontend/hooks/useActionDialogs";
import ConnectionQueryContextProvider from "src/frontend/hooks/useConnectionQuery";
import SettingContextProvider, { useDarkModeSetting } from "src/frontend/hooks/useSetting";
import ShowHideContextProvider from "src/frontend/hooks/useShowHide";
import TreeActionContextProvider from "src/frontend/hooks/useTreeActions";
import "src/frontend/App.scss";
import "src/frontend/electronRenderer";

function AppliedTheme({ children }) {
  const myTheme = createTheme({
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

  return (
    <ThemeProvider theme={myTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}

function CombinedContextProvider({ children }) {
  return [
    ActionDialogsContextProvider,
    ConnectionQueryContextProvider,
    TreeActionContextProvider,
    ShowHideContextProvider,
    SettingContextProvider,
    HashRouter,
    AppliedTheme,
  ].reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.render(
  <SnackbarProvider maxSnack={4}>
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <ReactQueryDevtools initialIsOpen={false} />

      <CombinedContextProvider>
        <Routes>
          <Route path="/data_snapshot" element={<DataSnapshotListView />} />
          <Route path="/data_snapshot/:dataSnapshotId" element={<DataSnapshotView />} />
          <Route path="/*" element={<App />} />
        </Routes>
        <ActionDialogs />
        <ElectronEventListener />
      </CombinedContextProvider>
    </QueryClientProvider>
  </SnackbarProvider>,
  document.querySelector("#body"),
);
