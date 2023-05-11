import React, { createContext, useCallback, useContext, useState } from 'react';

type TreeActionProps = {
  showContextMenu: boolean;
  onSelectCallback?: (connectionId?: string, databaseId?: string, tableId?: string) => void;
};

// used for show and hide the sidebar trees
let _treeActions: TreeActionProps = {
  showContextMenu: true,
  onSelectCallback: () => {},
};

const TargetContext = createContext({
  data: _treeActions,
  setTreeActions: (newTreeActionProps: Partial<TreeActionProps>) => {},
});

export default function WrappedContext(props: { children: React.ReactNode }): JSX.Element | null {
  // State to hold the theme value
  const [data, setData] = useState(_treeActions);

  const setTreeActions = useCallback((newTreeActionProps: Partial<TreeActionProps>) => {
    if (newTreeActionProps.showContextMenu !== undefined) {
      _treeActions.showContextMenu = newTreeActionProps.showContextMenu;
    }

    if (newTreeActionProps.onSelectCallback) {
      _treeActions.onSelectCallback = newTreeActionProps.onSelectCallback;
    }

    _treeActions = { ..._treeActions };

    setData(_treeActions);
  }, []);

  // Provide the theme value and toggle function to the children components
  return (
    <TargetContext.Provider
      value={{
        data,
        setTreeActions,
      }}>
      {props.children}
    </TargetContext.Provider>
  );
}

export function useTreeActions() {
  const { data, setTreeActions } = useContext(TargetContext)!;

  return {
    isLoading: false,
    data,
    setTreeActions,
  };
}
