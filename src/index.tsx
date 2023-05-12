import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import { HashRouter, Route, Routes } from 'react-router-dom';
import React from 'react';
import App from 'src/frontend/App';
import DataItemView from 'src/frontend/DataItemView';
import ActionDialogsContextProvider from 'src/frontend/hooks/useActionDialogs';
import ConnectionQueryContextProvider from 'src/frontend/hooks/useConnectionQuery';
import SettingContextProvider from 'src/frontend/hooks/useSetting';
import ShowHideContextProvider from 'src/frontend/hooks/useShowHide';
import TreeActionContextProvider from 'src/frontend/hooks/useTreeActions';
import ActionDialogs from 'src/frontend/components/ActionDialogs';
import 'src/frontend/App.scss';
import 'src/frontend/electronRenderer';

const CombinedContextProvider = ({ children }) => {
  return [
    ActionDialogsContextProvider,
    ConnectionQueryContextProvider,
    TreeActionContextProvider,
    ShowHideContextProvider,
    SettingContextProvider,
    HashRouter,
  ].reduceRight((acc, Provider) => <Provider>{acc}</Provider>, children);
};

const CommonModules = () => {
  return <>
    <ActionDialogs />
  </>
};

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
            <Route
              path='/data-table/:dataItemGroupKey'
              element={
                <>
                  <DataItemView />
                  <CommonModules />
                </>
              }
            />
            <Route
              path='/*'
              element={
                <>
                  <App />
                  <CommonModules />
                </>
              }
            />
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
