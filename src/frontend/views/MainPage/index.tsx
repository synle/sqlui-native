import { useState } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import QueryBoxTabs from 'src/frontend/components/QueryBoxTabs';
import Resizer from 'src/frontend/components/Resizer';
import {useSideBarWidthPreference} from 'src/frontend/hooks/useClientSidePreference';
import { LocalStorageConfig } from 'src/frontend/data/config';

export default function MainPage() {
  const {
    value: width,
    onChange: onSetWidth
  } = useSideBarWidthPreference();

  return (
    <section className='MainPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={onSetWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <QueryBoxTabs />
      </div>
    </section>
  );
}
