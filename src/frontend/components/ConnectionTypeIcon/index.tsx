import CloudIcon from '@mui/icons-material/Cloud';

type ConnectionTypeIconProps = {
  scheme?: string;
  status?: string;
};

export default function ConnectionTypeIcon(props: ConnectionTypeIconProps) {
  const { scheme, status } = props;

  if (status !== 'online') {
    return <CloudIcon color='disabled' fontSize='large' />;
  }

  switch (scheme) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
    case 'cassandra':
    case 'mongodb':
    case 'redis':
    case 'cosmosdb': // azure cosmosdb
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={25}
          height={25}
        />
      );
    default:
      return <CloudIcon color='primary' fontSize='large' />;
  }
}
