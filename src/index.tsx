import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { SnackbarProvider } from 'notistack';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { HashRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import App from 'src/frontend/App';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import DataItemView from 'src/frontend/DataItemView';
import ActionDialogsContextProvider from 'src/frontend/hooks/useActionDialogs';
import ConnectionQueryContextProvider from 'src/frontend/hooks/useConnectionQuery';
import SettingContextProvider, { useDarkModeSetting } from 'src/frontend/hooks/useSetting';
import ShowHideContextProvider from 'src/frontend/hooks/useShowHide';
import TreeActionContextProvider from 'src/frontend/hooks/useTreeActions';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';

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

  return <ThemeProvider theme={myTheme}>{children}</ThemeProvider>;
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
            <Route path='/data-table/:dataItemGroupKey' element={<DataItemView />} />
            <Route path='/*' element={<App />} />
          </Routes>
        </CombinedContextProvider>
      </QueryClientProvider>
    </SnackbarProvider>,
    document.querySelector('#body'),
  );

  window.removeEventListener('sqluiNativeEvent/ready', renderApp);
};

window.addEventListener('sqluiNativeEvent/ready', renderApp, false);

// tell the main app to get ready for initiation
window.dispatchEvent(new Event('sqluiNativeEvent/init'));
