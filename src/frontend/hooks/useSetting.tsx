import useMediaQuery from '@mui/material/useMediaQuery';
import { QueryClient, useQuery, useQueryClient } from 'react-query';
import { LocalStorageConfig } from 'src/frontend/data/config';
import { SqluiFrontend } from 'typings';

const QUERY_KEY_SETTINGS = 'settings';

// Settings
let _settings = LocalStorageConfig.get<SqluiFrontend.Settings>('clientConfig/cache.settings', {});

export function useSetting() {
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
  const { settings } = useSetting();
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  let value = settings?.darkMode;

  if (!value) {
    value = prefersDarkMode ? 'dark' : 'light';
  }

  return value;
}

export function useEditorModeSetting() {
  const { settings } = useSetting();

  let value = settings?.editorMode;

  if (value !== 'simple') {
    value = 'advanced';
  }

  return value;
}

export function useWordWrapSetting() {
  const { settings } = useSetting();
  return settings?.wordWrap === 'wrap';
}

export function useQueryTabOrientationSetting() {
  const { settings } = useSetting();
  return settings?.queryTabOrientation;
}

export const DEFAULT_QUERY_SIZE = 100;

export function useQuerySizeSetting() {
  const { settings } = useSetting();
  return parseInt(settings?.querySize + '') || DEFAULT_QUERY_SIZE;
}
export function useTablePageSize() {
  const { settings } = useSetting();
  return parseInt(settings?.tablePageSize + '');
}
export function useIsSoftDeleteModeSetting() {
  const { settings } = useSetting();
  return settings?.deleteMode !== 'hard-delete';
}
