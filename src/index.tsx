import CssBaseline from '@mui/material/CssBaseline';
import ReactDOM from 'react-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { ReactQueryDevtools } from 'react-query/devtools';
import React from 'react';
import App from 'src/frontend/App';
import { SnackbarProvider } from 'notistack';
import IconButton from '@mui/material/IconButton';
import { useSnackbar } from 'notistack';
import CloseIcon from '@mui/icons-material/Close';

const renderApp = function () {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  ReactDOM.render(
    <SnackbarProvider maxSnack={4}>
    <QueryClientProvider client={queryClient}>
      <CssBaseline />
      <ReactQueryDevtools initialIsOpen={false} />
      <App />
    </QueryClientProvider>
    </SnackbarProvider>,
    document.querySelector('#body'),
  );

  window.removeEventListener('sqluiNativeEvent/ready', renderApp);
};

window.addEventListener('sqluiNativeEvent/ready', renderApp, false);

// tell the main app to get ready for initiation
window.dispatchEvent(new Event('sqluiNativeEvent/init'));
