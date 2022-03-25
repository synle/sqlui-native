import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';

type ConnectionHintProps = {
  onChange: (dialect: string, connection: string) => void;
};

export default function ConnectionHint(props: ConnectionHintProps) {
  return (
    <>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='mysql' status='online' />}>
        <AlertTitle>MySQL</AlertTitle>
        <Tooltip title='Use this sample MySQL connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('Mysql', 'mysql://root:password@localhost:3306')}>
            mysql://root:password@localhost:3306
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='mariadb' status='online' />}>
        <AlertTitle>MariaDB</AlertTitle>
        <Tooltip title='Use this sample MariaDB connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('Mariadb', 'mariadb://root:password@localhost:3306')}>
            mariadb://root:password@localhost:3306
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='mssql' status='online' />}>
        <AlertTitle>Microsoft SQL Server</AlertTitle>
        <Tooltip title='Use this sample Microsoft SQL Server connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('Mssql', 'mssql://sa:password123!@localhost:1433')}>
            mssql://sa:password123!@localhost:1433
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='postgres' status='online' />}>
        <AlertTitle>PostgresSQL</AlertTitle>
        <Tooltip title='Use this sample PostgresSQL connection.'>
          <Link
            underline='hover'
            onClick={() =>
              props.onChange('Postgres', 'postgres://postgres:password@localhost:5432')
            }>
            postgres://postgres:password@localhost:5432
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='sqlite' status='online' />}>
        <AlertTitle>SQLite</AlertTitle>
        <Tooltip title='Use this sample SQLite connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('Sqlite', 'sqlite://test-db.sqlite')}>
            sqlite://test-db.sqlite
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='cassandra' status='online' />}>
        <AlertTitle>Cassandra</AlertTitle>
        <Tooltip title='Use this sample Cassandra connection.'>
          <Link
            underline='hover'
            onClick={() =>
              props.onChange('Cassandra', 'cassandra://username:password@localhost:9042')
            }>
            cassandra://username:password@localhost:9042
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='mongodb' status='online' />}>
        <AlertTitle>MongoDB</AlertTitle>
        <Tooltip title='Use this sample MongoDB connection.'>
          <Link
            underline='hover'
            onClick={() => props.onChange('Mongodb', 'mongodb://localhost:27017')}>
            mongodb://localhost:27017
          </Link>
        </Tooltip>
      </Alert>
      <Alert severity='info' icon={<ConnectionTypeIcon scheme='redis' status='online' />}>
        <AlertTitle>Redis</AlertTitle>
        <Tooltip title='Use this sample Redis connection.'>
          <Link underline='hover' onClick={() => props.onChange('Redis', 'redis://localhost:6379')}>
            redis://localhost:6379
          </Link>
        </Tooltip>
      </Alert>
    </>
  );
}
