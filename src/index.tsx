import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, Theme, ThemeProvider } from "@mui/material/styles";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { HashRouter, Route, Routes } from "react-router";
import { useEffect, useState } from "react";
import App from "src/frontend/App";
import SessionExpiredPage from "src/frontend/views/SessionExpiredPage";
import SessionSelectPage from "src/frontend/views/SessionSelectPage";
import ActionDialogs from "src/frontend/components/ActionDialogs";
import NativeEventListener from "src/frontend/components/NativeEventListener";
import DataSnapshotListView from "src/frontend/DataSnapshotListView";
import DataSnapshotView from "src/frontend/DataSnapshotView";
import ActionDialogsContextProvider from "src/frontend/hooks/useActionDialogs";
import ConnectionQueryContextProvider from "src/frontend/hooks/useConnectionQuery";
import SettingContextProvider, { useDarkModeSetting } from "src/frontend/hooks/useSetting";
import ShowHideContextProvider from "src/frontend/hooks/useShowHide";
import TreeActionContextProvider from "src/frontend/hooks/useTreeActions";
import { useLayoutModeSetting, useIsAnimationModeOn } from "src/frontend/hooks/useSetting";
import { initPlatform } from "src/frontend/platform";
import "src/frontend/App.scss";

/**
 * Applies the active MUI theme (dark/light, compact/comfortable, animations) to its subtree.
 * @param {{ children: React.ReactNode }} props - Component children to wrap with the theme.
 */
function AppliedTheme({ children }) {
  const isCompact = useLayoutModeSetting() === "compact";
  const darkmodeSetting = useDarkModeSetting();
  const isAnimationOff = useIsAnimationModeOn();

  const [theme, setTheme] = useState<Theme>(createTheme());

  useEffect(() => {
    // Common settings regardless of mode
    const baseTheme = {
      MuiButtonBase: { defaultProps: { disableRipple: true } },
      MuiTooltip: { defaultProps: { enterDelay: 500 } },
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
      globalOverrides["*:not(.MuiTooltip-popper, .MuiTooltip-popper *), *::before, *::after"] = {
        transitionDuration: "0s !important",
        animationDuration: "0s !important",
        transitionTimingFunction: "linear !important",
        animationTimingFunction: "linear !important",
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

/**
 * HashRouter pre-configured with React Router v7 future flags to suppress deprecation warnings.
 * @param {{ children: React.ReactNode }} props - Component children to wrap with the router.
 */
function FutureHashRouter({ children }) {
  return <HashRouter>{children}</HashRouter>;
}

/**
 * Composes all application context providers and the router into a single wrapper.
 * @param {{ children: React.ReactNode }} props - The root application tree to wrap.
 */
function CombinedContextProvider({ children }) {
  return [
    ActionDialogsContextProvider,
    ConnectionQueryContextProvider,
    TreeActionContextProvider,
    ShowHideContextProvider,
    SettingContextProvider,
    FutureHashRouter,
    AppliedTheme,
  ].reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
}

/**
 * Renders React Query Devtools when toggled via Ctrl+Shift+Alt+D (Win/Linux) or Cmd+Shift+Option+D (Mac).
 * Renders nothing when the panel is hidden.
 */
function DevtoolsToggle() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Shift+Alt+D (Windows/Linux) or Cmd+Shift+Option+D (Mac) to toggle React Query devtools
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.altKey && e.key === "D") {
        setShow((prev) => !prev);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!show) return null;
  return <ReactQueryDevtools initialIsOpen={true} />;
}

/**
 * Initializes the React Query client and mounts the full application into the #body DOM node.
 * Awaits platform initialization (Tauri sidecar port resolution or Electron IPC setup).
 */
const renderApp = async function () {
  // Initialize platform (sets up Tauri sidecar port or Electron IPC for shell integration)
  await initPlatform();

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 600000, // 10 minutes - avoid unnecessary refetches
        refetchOnWindowFocus: true, // always refresh when user returns to the app
      },
    },
  });

  const root = createRoot(document.querySelector("#body")!);
  root.render(
    <QueryClientProvider client={queryClient}>
      <DevtoolsToggle />
      <CombinedContextProvider>
        <Routes>
          <Route path="/data_snapshot" element={<DataSnapshotListView />} />
          <Route path="/data_snapshot/:dataSnapshotId" element={<DataSnapshotView />} />
          <Route path="/session_expired" element={<SessionExpiredPage />} />
          <Route path="/session_select" element={<SessionSelectPage />} />
          <Route path="/*" element={<App />} />
        </Routes>
        <ActionDialogs />
        <NativeEventListener />
      </CombinedContextProvider>
    </QueryClientProvider>,
  );
};

renderApp();
