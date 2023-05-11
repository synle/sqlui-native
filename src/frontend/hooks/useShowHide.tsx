import React, { createContext, useContext, useState } from 'react';
import { SessionStorageConfig } from 'src/frontend/data/config';
import { SqluiFrontend } from 'typings';
// used for show and hide the sidebar trees
let _treeVisibles = SessionStorageConfig.get<SqluiFrontend.TreeVisibilities>(
  'clientConfig/cache.treeVisibles',
  {},
);

const TargetContext = createContext({
  visibles: _treeVisibles,
  onToggle: (key: string, isVisible?: boolean) => {},
  onClear: () => {},
  onSet: (newTreeVisibles: SqluiFrontend.TreeVisibilities) => {},
});

export default function WrappedContext(props: { children: React.ReactNode }): JSX.Element | null {
  // State to hold the theme value
  const [visibles, setVisibles] = useState(_treeVisibles);

  const onToggle = (key: string, isVisible?: boolean) => {
    let newVisible: boolean;
    if (isVisible === undefined) {
      newVisible = !_treeVisibles[key];
    } else {
      newVisible = isVisible;
    }

    _updateVisibles({ ..._treeVisibles, ...{ [key]: newVisible } });
  };

  const onSet = (newTreeVisibles: SqluiFrontend.TreeVisibilities) => {
    _updateVisibles(newTreeVisibles);
  };

  const onClear = () => {
    _updateVisibles({});
  };

  function _updateVisibles(newTreeVisibles: SqluiFrontend.TreeVisibilities) {
    _treeVisibles = { ...newTreeVisibles };
    setVisibles(_treeVisibles);
  }

  // Provide the theme value and toggle function to the children components
  return (
    <TargetContext.Provider value={{ visibles, onToggle, onClear, onSet }}>
      {props.children}
    </TargetContext.Provider>
  );
}

export function useShowHide() {
  const { visibles, onToggle, onClear, onSet } = useContext(TargetContext)!;

  return {
    visibles,
    onToggle,
    onClear,
    onSet,
  };
}
