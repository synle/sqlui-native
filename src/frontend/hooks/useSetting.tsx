import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useCallback } from "react";
import { useGetServerConfigs, useUpdateServerConfigs } from "src/frontend/hooks/useServerConfigs";
import { SqluiFrontend } from "typings";

/**
 * Pass-through provider kept for backwards compatibility with CombinedContextProvider.
 * @param props - Component props containing child elements.
 * @returns The children as-is without additional wrapping.
 */
export default function SettingContextProvider(props: { children: React.ReactNode }): JSX.Element {
  return <>{props.children}</>;
}

/**
 * Hook providing the current application settings and an onChange handler to update them.
 * @returns The settings object and an onChange callback.
 */
export function useSetting() {
  const { data: serverConfigs } = useGetServerConfigs();
  const { mutate: updateConfigs } = useUpdateServerConfigs();

  const settings: SqluiFrontend.Settings = {
    darkMode: serverConfigs?.darkMode,
    animationMode: serverConfigs?.animationMode,
    layoutMode: serverConfigs?.layoutMode,
    querySelectionMode: serverConfigs?.querySelectionMode,
    editorMode: serverConfigs?.editorMode,
    editorHeight: serverConfigs?.editorHeight,
    tableRenderer: serverConfigs?.tableRenderer,
    wordWrap: serverConfigs?.wordWrap,
    queryTabOrientation: serverConfigs?.queryTabOrientation,
    querySize: serverConfigs?.querySize,
    tablePageSize: serverConfigs?.tablePageSize,
    maxToasts: serverConfigs?.maxToasts,
    deleteMode: serverConfigs?.deleteMode,
  };

  const onChange = useCallback(
    (newSettings: SqluiFrontend.Settings) => {
      updateConfigs(newSettings);
    },
    [updateConfigs],
  );

  return {
    settings,
    onChange,
  };
}

/**
 * Hook returning the effective dark mode setting, falling back to system preference.
 * @returns "dark" or "light".
 */
export function useDarkModeSetting() {
  const { settings } = useSetting();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  let value = settings?.darkMode;

  if (!value) {
    value = prefersDarkMode ? "dark" : "light";
  }

  return value;
}

/**
 * Hook returning whether animations are enabled, respecting system reduced motion preference.
 * @returns True if animations are enabled.
 */
export function useIsAnimationModeOn() {
  const { settings } = useSetting();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion)");

  const value = settings?.animationMode;

  if (value === "off") return false;
  if (value === "on") return true;

  // follows system: animation on unless system prefers reduced motion
  return !prefersReducedMotion;
}

/**
 * Hook returning the layout mode setting.
 * @returns "compact" or "comfortable".
 */
export function useLayoutModeSetting() {
  const { settings } = useSetting();
  return settings?.layoutMode === "compact" ? "compact" : "comfortable";
}

/**
 * Hook returning the editor height setting.
 * @returns "small", "medium", or "full".
 */
export function useEditorHeightSetting() {
  const { settings } = useSetting();
  const value = settings?.editorHeight;
  if (value === "medium" || value === "full") return value;
  return "small";
}

/**
 * Hook returning the editor mode setting.
 * @returns "simple" or "advanced".
 */
export function useEditorModeSetting() {
  const { settings } = useSetting();

  let value = settings?.editorMode;

  if (value !== "simple") {
    value = "advanced";
  }

  return value;
}

/**
 * Hook returning the table renderer setting.
 * @returns "simple" or "advanced".
 */
export function useTableRenderer() {
  const { settings } = useSetting();

  let value = settings?.tableRenderer;

  if (value !== "simple") {
    value = "advanced";
  }

  return value;
}

/**
 * Hook returning whether word wrap is enabled in the editor.
 * @returns True if word wrap is enabled.
 */
export function useWordWrapSetting() {
  const { settings } = useSetting();
  return settings?.wordWrap === "wrap";
}

/**
 * Hook returning the query tab orientation setting.
 * @returns The query tab orientation value.
 */
export function useQueryTabOrientationSetting() {
  const { settings } = useSetting();
  return settings?.queryTabOrientation;
}

/** Default number of rows to return per query execution. */
export const DEFAULT_QUERY_SIZE = 100;

/**
 * Hook returning the configured query result size limit.
 * @returns The maximum number of rows per query, defaulting to DEFAULT_QUERY_SIZE.
 */
export function useQuerySizeSetting() {
  const { settings } = useSetting();
  return parseInt(settings?.querySize + "") || DEFAULT_QUERY_SIZE;
}

/**
 * Hook returning the number of rows per page in table results.
 * @returns The table page size as a number.
 */
export function useTablePageSize() {
  const { settings } = useSetting();
  return parseInt(settings?.tablePageSize + "");
}

/** Default maximum number of concurrent toast notifications displayed. */
export const DEFAULT_MAX_TOASTS = 3;

/**
 * Hook returning the maximum number of toast notifications to display at once.
 * @returns The max toasts setting, defaulting to DEFAULT_MAX_TOASTS.
 */
export function useMaxToastsSetting() {
  const { settings } = useSetting();
  const parsed = parseInt(settings?.maxToasts + "") || DEFAULT_MAX_TOASTS;
  return Math.min(10, Math.max(3, parsed));
}

/**
 * Hook returning whether soft delete mode is enabled (items go to recycle bin instead of permanent deletion).
 * @returns True if soft delete mode is active.
 */
export function useIsSoftDeleteModeSetting() {
  const { settings } = useSetting();
  return settings?.deleteMode !== "hard-delete";
}
