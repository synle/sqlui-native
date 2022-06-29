import { useEffect } from 'react';
import Breadcrumbs from 'src/frontend/components/Breadcrumbs';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import QueryBoxTabs from 'src/frontend/components/QueryBoxTabs';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';

export default function MainPage() {
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: true,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='MainPage'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: 'Query Page',
            },
          ]}
        />
        <QueryBoxTabs />
      </>
    </LayoutTwoColumns>
  );
}
