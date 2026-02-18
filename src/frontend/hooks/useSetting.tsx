import useMediaQuery from '@mui/material/useMediaQuery';
import { useQuery } from 'src/frontend/utils/reactQueryUtils';
import React, { createContext, useContext, useState } from 'react';
import { LocalStorageConfig } from 'src/frontend/data/config';
import { SqluiFrontend } from 'typings';
// Settings
let _settings = LocalStorageConfig.get<SqluiFrontend.Settings>('clientConfig/cache.settings', {});

const TargetContext = createContext({
  settings: _settings,
  onChange: (newSettings: SqluiFrontend.Settings) => {},
});

export default function WrappedContext(props: { children: React.ReactNode }): JSX.Element | null {
  // State to hold the theme value
  const [settings, setSettings] = useState(_settings);

  // Function to toggle the theme
  const onChange = (newSettings: SqluiFrontend.Settings) => {
    setSettings({ ...newSettings });
    LocalStorageConfig.set('clientConfig/cache.settings', newSettings);
  };

  // Provide the theme value and toggle function to the children components
  return (
    <TargetContext.Provider value={{ settings, onChange }}>{props.children}</TargetContext.Provider>
  );
}

export function useSetting() {
  const { settings, onChange } = useContext(TargetContext)!;

  return {
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

export function useAnimationModeSetting() {
  const { settings } = useSetting();
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion)');

  const value = settings?.animationMode;

  if (value === '0') return false;
  if (value === '1') return true;

  // follows system: animation on unless system prefers reduced motion
  return !prefersReducedMotion;
}

export function useLayoutModeSetting() {
  const { settings } = useSetting();
  return settings?.layoutMode === '1' ? 'compact' : 'comfortable';
}

export function useEditorModeSetting() {
  const { settings } = useSetting();

  let value = settings?.editorMode;

  if (value !== 'simple') {
    value = 'advanced';
  }

  return value;
}

export function useTableRenderer() {
  const { settings } = useSetting();

  let value = settings?.tableRenderer;

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
