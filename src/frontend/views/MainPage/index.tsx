import { useState } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import QueryBoxTabs from 'src/frontend/components/QueryBoxTabs';
import Resizer from 'src/frontend/components/Resizer';
import { LocalStorageConfig } from 'src/frontend/data/config';

export default function MainPage() {
  const [width, setWidth] = useState<undefined | number>(
    LocalStorageConfig.get<number>('clientConfig/leftPanelWidth', 300),
  );
  const onSetWidth = (newWidth: number) => {
    LocalStorageConfig.set('clientConfig/leftPanelWidth', newWidth);
    setWidth(newWidth);
  };

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
