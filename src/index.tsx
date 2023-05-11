import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import React from 'react';
import App from 'src/frontend/App';
import ActionDialogsContextProvider from 'src/frontend/hooks/useActionDialogs';
import ConnectionQueryContextProvider from 'src/frontend/hooks/useConnectionQuery';
import SettingContextProvider from 'src/frontend/hooks/useSetting';
import ShowHideContextProvider from 'src/frontend/hooks/useShowHide';
import TreeActionContextProvider from 'src/frontend/hooks/useTreeActions';

const CombinedContextProvider = ({ children }) => {
  return [
    ActionDialogsContextProvider,
    ConnectionQueryContextProvider,
    TreeActionContextProvider,
    ShowHideContextProvider,
    SettingContextProvider,
  ].reduceRight(
    (acc, Provider) => <Provider>{acc}</Provider>,
    children
  );
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
          <App />
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
