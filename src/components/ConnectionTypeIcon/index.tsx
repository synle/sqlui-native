import CloudIcon from '@mui/icons-material/Cloud';
import { SqluiCore } from 'typings';

interface ConnectionTypeIconProps {
  scheme?: string;
  status?: string;
}

export default function ConnectionTypeIcon(props: ConnectionTypeIconProps) {
  const { scheme, status } = props;

  if (status !== 'online') {
    return <CloudIcon color='disabled' fontSize='large' />;
  }

  switch (scheme) {
    case 'mssql':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/sqlserver.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'postgres':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/postgresql.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'sqlite':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/sqlite.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'mariadb':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/mariadb.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'mysql':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/mysql.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'cassandra':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/cassandra.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'mongodb':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/mongodb.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    default:
      return <CloudIcon color='primary' fontSize='large' />;
  }
}
