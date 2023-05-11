import CssBaseline from '@mui/material/CssBaseline';
import { SnackbarProvider } from 'notistack';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import React from 'react';
import App from 'src/frontend/App';
import ActionDialogsContext from 'src/frontend/hooks/useActionDialogs';
import ConnectionQueryContext from 'src/frontend/hooks/useConnectionQuery';
import SettingProvider from 'src/frontend/hooks/useSetting';
import ShowHideContext from 'src/frontend/hooks/useShowHide';
import TreeActionContext from 'src/frontend/hooks/useTreeActions';

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

        <ActionDialogsContext>
          <ConnectionQueryContext>
            <TreeActionContext>
              <ShowHideContext>
                <SettingProvider>
                  <App />
                </SettingProvider>
              </ShowHideContext>
            </TreeActionContext>
          </ConnectionQueryContext>
        </ActionDialogsContext>
      </QueryClientProvider>
    </SnackbarProvider>,
    document.querySelector('#body'),
  );

  window.removeEventListener('sqluiNativeEvent/ready', renderApp);
};

window.addEventListener('sqluiNativeEvent/ready', renderApp, false);

// tell the main app to get ready for initiation
window.dispatchEvent(new Event('sqluiNativeEvent/init'));
