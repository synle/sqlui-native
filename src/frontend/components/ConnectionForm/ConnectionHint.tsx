import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';
import { getSampleConnectionString } from 'src/frontend/data/sql';

type ConnectionHintProps = {
  onChange: (dialect: string, connection: string) => void;
};

export default function ConnectionHint(props: ConnectionHintProps) {
  const supportedConnections = [
    'mysql',
    'mariadb',
    'mssql',
    'postgres',
    'sqlite',
    'cassandra',
    'mongodb',
    'redis',
    'cosmosdb',
  ];

  return (
    <>
      {supportedConnections.map((connection) => {
        return (
          <Alert severity='info' icon={<ConnectionTypeIcon scheme={connection} status='online' />}>
            <AlertTitle>{connection}</AlertTitle>
            <Tooltip title={`Use this sample ${connection} connection string.`}>
              <Link
                underline='hover'
                onClick={() => props.onChange(connection, getSampleConnectionString(connection))}>
                {getSampleConnectionString(connection)}
              </Link>
            </Tooltip>
          </Alert>
        );
      })}
    </>
  );
}
