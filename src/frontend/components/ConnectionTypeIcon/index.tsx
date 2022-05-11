import CloudIcon from '@mui/icons-material/Cloud';
import { SUPPORTED_DIALECTS } from 'src/common/adapters/DataScriptFactory';

type ConnectionTypeIconProps = {
  dialect?: string;
  status?: string;
};

export default function ConnectionTypeIcon(props: ConnectionTypeIconProps) {
  const { dialect, status } = props;

  if (status !== 'online') {
    return <CloudIcon color='disabled' fontSize='large' />;
  }

  if (dialect && SUPPORTED_DIALECTS.indexOf(dialect) >= 0) {
    return (
      <img
        src={`${process.env.PUBLIC_URL}/assets/${dialect}.png`}
        alt={dialect}
        title={dialect}
        width={25}
        height={25}
      />
    );
  }

  return <CloudIcon color='primary' fontSize='large' />;
}
