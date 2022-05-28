import { useState } from 'react';
import { LocalStorageConfig } from 'src/frontend/data/config';

type ClientSidePreferenceKey = 'clientConfig/leftPanelWidth';

export function useLocalStoragePreferences<T>(
  key: ClientSidePreferenceKey,
  defaultValue: T,
  storageToUse = LocalStorageConfig,
) {
  const [value, setValue] = useState<undefined | T>(LocalStorageConfig.get<T>(key, defaultValue));
  const onChange = (newValue: T) => {
    LocalStorageConfig.set(key, newValue);
    setValue(newValue);
  };

  return {
    value,
    onChange,
  };
}
export function useSideBarWidthPreference() {
  return useLocalStoragePreferences<number>('clientConfig/leftPanelWidth', 300);
}
