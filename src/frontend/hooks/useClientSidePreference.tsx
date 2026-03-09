import { useState } from "react";
import { LocalStorageConfig } from "src/frontend/data/config";

/** Valid keys for client-side preferences stored in localStorage. */
type ClientSidePreferenceKey = "clientConfig/leftPanelWidth";

/**
 * Hook for reading and writing a typed preference value to localStorage.
 * @param key - The localStorage preference key.
 * @param defaultValue - Default value if no stored value exists.
 * @returns The current value and an onChange handler to update it.
 */
export function useLocalStoragePreferences<T>(key: ClientSidePreferenceKey, defaultValue: T) {
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
/**
 * Hook for managing the sidebar panel width preference.
 * @returns The current sidebar width value and an onChange handler.
 */
export function useSideBarWidthPreference() {
  return useLocalStoragePreferences<number>("clientConfig/leftPanelWidth", 300);
}
