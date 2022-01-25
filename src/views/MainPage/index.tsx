import NewConnectionButton from 'src/components/NewConnectionButton';
import ConnectionDescription from 'src/components/ConnectionDescription';
import QueryResultTabs from 'src/components/QueryResultTabs';

export default function MainPage() {
  return (
    <section className='MainPage'>
      <div className='MainPage__LeftPane'>
        <div>
          <NewConnectionButton />
        </div>
        <div>
          <ConnectionDescription />
        </div>
      </div>
      <div className='MainPage__RightPane'>
        <QueryResultTabs />
      </div>
    </section>
  );
}
