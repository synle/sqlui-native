import useMediaQuery from '@mui/material/useMediaQuery';
import { QueryClient } from 'react-query';
import { useMutation } from 'react-query';
import { useQuery } from 'react-query';
import { useQueryClient } from 'react-query';
import dataApi from 'src/data/api';
import { LocalStorageConfig } from 'src/data/config';
import { SessionStorageConfig } from 'src/data/config';
import { getCurrentSessionId } from 'src/data/session';
import { SqluiCore } from 'typings';
import { SqluiFrontend } from 'typings';

const QUERY_KEY_SETTINGS = 'qk.settings';

// Settings
let _settings = LocalStorageConfig.get<SqluiFrontend.Settings>('clientConfig/cache.settings', {});

export function useSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery(QUERY_KEY_SETTINGS, () => _settings, {
    onSuccess: (data) => LocalStorageConfig.set('clientConfig/cache.settings', _settings),
  });

  const onChange = (newSettings: SqluiFrontend.Settings) => {
    _settings = { ...newSettings };

    queryClient.setQueryData<SqluiFrontend.Settings | undefined>(
      QUERY_KEY_SETTINGS,
      () => _settings,
    );
  };

  return {
    isLoading,
    settings,
    onChange,
  };
}

export function useDarkModeSetting() {
  const { settings } = useSettings();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  let value = settings?.darkMode;

  if (!value) {
    value = prefersDarkMode ? 'dark' : 'light';
  }

  return value;
}

export function useEditorModeSetting() {
  const { settings } = useSettings();

  let value = settings?.editorMode;

  if (value !== 'simple') {
    value = 'advanced';
  }

  return value;
}

export function useWordWrapSetting() {
  const { settings } = useSettings();
  return settings?.wordWrap === 'wrap';
}

export function useQueryTabOrientationSetting() {
  const { settings } = useSettings();
  return settings?.queryTabOrientation;
}

export const DEFAULT_QUERY_SIZE = 100;

export function useQuerySizeSetting() {
  const { settings } = useSettings();
  return parseInt(settings?.querySize + '') || DEFAULT_QUERY_SIZE;
}
