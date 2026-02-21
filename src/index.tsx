import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, Theme, ThemeProvider } from "@mui/material/styles";
import ReactDOM from "react-dom";
import { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { persister } from "src/frontend/data/cacheStorage";
import { HashRouter, Route, Routes } from "react-router-dom";
import { useEffect, useState } from "react";
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
import { useLayoutModeSetting, useIsAnimationModeOn } from "src/frontend/hooks/useSetting";
import "src/frontend/App.scss";
import "src/frontend/electronRenderer";

function AppliedTheme({ children }) {
  const isCompact = useLayoutModeSetting() === "compact";
  const darkmodeSetting = useDarkModeSetting();
  const isAnimationOff = useIsAnimationModeOn();

  const [theme, setTheme] = useState<Theme>(createTheme());

  useEffect(() => {
    // Common settings regardless of mode
    const baseTheme = {
      MuiButtonBase: { defaultProps: { disableRipple: true } },
    };

    // Mode A: Compact (Small, No Icons, Dense)
    const compactStyles = {
      typography: { fontSize: 12 },
      components: {
        MuiButton: {
          defaultProps: { size: "small" as const },
          styleOverrides: {
            root: {
              "& .MuiButton-startIcon, & .MuiButton-endIcon": { display: "none" },
              minWidth: "auto",
              padding: "4px 8px",
            },
          },
        },
        MuiTextField: { defaultProps: { size: "small" as const } },
        MuiFormControl: { defaultProps: { size: "small" as const } },
        MuiIconButton: { defaultProps: { size: "small" as const } },
        MuiInputBase: { defaultProps: { margin: "dense" as const } },
      },
    };

    // Mode B: Comfortable (Standard MUI sizes)
    const comfortableStyles = {
      typography: { fontSize: 14 },
      components: {
        MuiButton: { defaultProps: { size: "medium" as const } },
        MuiTextField: { defaultProps: { size: "medium" as const } },
        MuiFormControl: { defaultProps: { size: "medium" as const } },
        MuiIconButton: { defaultProps: { size: "medium" as const } },
        MuiInputBase: { defaultProps: { margin: "none" as const } },
      },
    };

    // 1. Determine active layout set
    const activeLayout = isCompact ? compactStyles : comfortableStyles;

    // 2. Build Global CSS (Animations & Custom Classes)
    const globalOverrides: any = {};

    if (isAnimationOff) {
      globalOverrides["*, *::before, *::after"] = {
        transitionDuration: "0s !important",
        animationDuration: "0s !important",
      };
    }

    if (isCompact) {
      globalOverrides[".FormInput__Container"] = {
        ".FormInput__Row": { gap: "0.5rem" },
        "&.FormInput__Container__sm .FormInput__Row": { gap: "0.3rem" },
      };
    }

    // 3. Stitch and Apply
    setTheme(
      createTheme({
        palette: { mode: darkmodeSetting },
        typography: activeLayout.typography,
        components: {
          ...baseTheme,
          ...activeLayout.components,
          MuiCssBaseline: { styleOverrides: globalOverrides },
        },
      }),
    );
  }, [isCompact, darkmodeSetting, isAnimationOff, setTheme]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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

const renderApp = function () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        cacheTime: 1000 * 60 * 60 * 24, // 24 hours - keep entries long enough to be persisted
      },
    },
  });

  const persistOptions = {
    persister,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
  };

  ReactDOM.render(
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
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
    </PersistQueryClientProvider>,
    document.querySelector("#body"),
  );

  window.removeEventListener("sqluiNativeEvent/ready", renderApp);
};

window.addEventListener("sqluiNativeEvent/ready", renderApp, false);

// tell the main app to get ready for initiation
window.dispatchEvent(new Event("sqluiNativeEvent/init"));
