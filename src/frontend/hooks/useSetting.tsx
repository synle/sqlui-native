import useMediaQuery from "@mui/material/useMediaQuery";
import React, { useCallback } from "react";
import { useGetServerConfigs, useUpdateServerConfigs } from "src/frontend/hooks/useServerConfigs";
import { SqluiFrontend } from "typings";

// Pass-through provider kept for backwards compatibility with CombinedContextProvider
export default function SettingContextProvider(props: { children: React.ReactNode }): JSX.Element {
  return <>{props.children}</>;
}

export function useSetting() {
  const { data: serverConfigs } = useGetServerConfigs();
  const { mutate: updateConfigs } = useUpdateServerConfigs();

  const settings: SqluiFrontend.Settings = {
    darkMode: serverConfigs?.darkMode,
    animationMode: serverConfigs?.animationMode,
    layoutMode: serverConfigs?.layoutMode,
    querySelectionMode: serverConfigs?.querySelectionMode,
    editorMode: serverConfigs?.editorMode,
    tableRenderer: serverConfigs?.tableRenderer,
    wordWrap: serverConfigs?.wordWrap,
    queryTabOrientation: serverConfigs?.queryTabOrientation,
    querySize: serverConfigs?.querySize,
    tablePageSize: serverConfigs?.tablePageSize,
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

export function useDarkModeSetting() {
  const { settings } = useSetting();
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  let value = settings?.darkMode;

  if (!value) {
    value = prefersDarkMode ? "dark" : "light";
  }

  return value;
}

export function useIsAnimationModeOn() {
  const { settings } = useSetting();
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion)");

  const value = settings?.animationMode;

  if (value === "off") return false;
  if (value === "on") return true;

  // follows system: animation on unless system prefers reduced motion
  return !prefersReducedMotion;
}

export function useLayoutModeSetting() {
  const { settings } = useSetting();
  return settings?.layoutMode === "compact" ? "compact" : "comfortable";
}

export function useEditorModeSetting() {
  const { settings } = useSetting();

  let value = settings?.editorMode;

  if (value !== "simple") {
    value = "advanced";
  }

  return value;
}

export function useTableRenderer() {
  const { settings } = useSetting();

  let value = settings?.tableRenderer;

  if (value !== "simple") {
    value = "advanced";
  }

  return value;
}

export function useWordWrapSetting() {
  const { settings } = useSetting();
  return settings?.wordWrap === "wrap";
}

export function useQueryTabOrientationSetting() {
  const { settings } = useSetting();
  return settings?.queryTabOrientation;
}

export const DEFAULT_QUERY_SIZE = 100;

export function useQuerySizeSetting() {
  const { settings } = useSetting();
  return parseInt(settings?.querySize + "") || DEFAULT_QUERY_SIZE;
}

export function useTablePageSize() {
  const { settings } = useSetting();
  return parseInt(settings?.tablePageSize + "");
}

export function useIsSoftDeleteModeSetting() {
  const { settings } = useSetting();
  return settings?.deleteMode !== "hard-delete";
}
