import { Link } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import DatabaseDescription from 'src/components/DatabaseDescription';
import DeleteConnectionButton from 'src/components/DeleteConnectionButton';
import { useGetConnections, useShowHide } from 'src/hooks';

export default function ConnectionDescription() {
  const { data: connections, isLoading } = useGetConnections();
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!connections || connections.length === 0) {
    return <>No Data</>;
  }

  return (
    <div className='ConnectionDescription'>
      {connections.map((connection) => (
        <div key={connection.id}>
          <div className='ConnectionDescription__TitleRow'>
            <a className='ConnectionDescription__Title' onClick={() => onToggle(connection.id)}>
              {connection.name}
            </a>
            <Link to={`/connection/edit/${connection.id}`}><EditIcon /></Link>
            <DeleteConnectionButton connectionId={connection.id} />
          </div>

          {!visibles[connection.id] ? null : <DatabaseDescription connectionId={connection.id} />}
        </div>
      ))}
    </div>
  );
}
