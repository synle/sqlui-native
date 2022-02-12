import CloudIcon from '@mui/icons-material/Cloud';

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
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'postgres':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'sqlite':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'mariadb':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'mysql':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'cassandra':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'mongodb':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    case 'redis':
      return (
        <img
          src={`${process.env.PUBLIC_URL}/assets/${scheme}.png`}
          alt={scheme}
          title={scheme}
          width={30}
        />
      );
    default:
      return <CloudIcon color='primary' fontSize='large' />;
  }
}
