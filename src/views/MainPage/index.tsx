import {useState} from 'react';
import {LocalStorageConfig} from 'src/data/config';
import ConnectionDescription from 'src/components/ConnectionDescription';
import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBoxTabs from 'src/components/QueryBoxTabs';
import Resizer from 'src/components/Resizer';
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