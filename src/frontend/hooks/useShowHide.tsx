import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { SessionStorageConfig } from "src/frontend/data/config";
import { SqluiFrontend } from "typings";
// used for show and hide the sidebar trees
let _treeVisibles = SessionStorageConfig.get<SqluiFrontend.TreeVisibilities>("clientConfig/cache.treeVisibles", {});

const TargetContext = createContext({
  visibles: _treeVisibles,
  onToggle: (_key: string, _isVisible?: boolean) => {},
  onClear: () => {},
  onSet: (_newTreeVisibles: SqluiFrontend.TreeVisibilities) => {},
});

/**
 * Context provider for sidebar tree visibility state. Persists visibility to session storage.
 * @param props - Component props containing child elements.
 * @returns The context provider wrapping children.
 */
export default function WrappedContext(props: { children: React.ReactNode }): JSX.Element | null {
  // State to hold the theme value
  const [visibles, setVisibles] = useState(_treeVisibles);

  const _updateVisibles = useCallback((newTreeVisibles: SqluiFrontend.TreeVisibilities) => {
    _treeVisibles = { ...newTreeVisibles };
    setVisibles(_treeVisibles);
    SessionStorageConfig.set("clientConfig/cache.treeVisibles", _treeVisibles);
  }, []);

  const onToggle = useCallback(
    (key: string, isVisible?: boolean) => {
      const newVisible = isVisible === undefined ? !_treeVisibles[key] : isVisible;
      _updateVisibles({ ..._treeVisibles, [key]: newVisible });
    },
    [_updateVisibles],
  );

  const onSet = useCallback(
    (newTreeVisibles: SqluiFrontend.TreeVisibilities) => {
      _updateVisibles(newTreeVisibles);
    },
    [_updateVisibles],
  );

  const onClear = useCallback(() => {
    _updateVisibles({});
  }, [_updateVisibles]);

  /** Memoized context value to prevent unnecessary re-renders of consumers. */
  const contextValue = useMemo(() => ({ visibles, onToggle, onClear, onSet }), [visibles, onToggle, onClear, onSet]);

  // Provide the theme value and toggle function to the children components
  return <TargetContext.Provider value={contextValue}>{props.children}</TargetContext.Provider>;
}

/**
 * Hook providing visibility state and toggle/clear/set methods for sidebar tree nodes.
 * @returns Visibility map and handlers to toggle, clear, or set visibility.
 */
export function useShowHide() {
  const { visibles, onToggle, onClear, onSet } = useContext(TargetContext)!;

  return {
    visibles,
    onToggle,
    onClear,
    onSet,
  };
}
