import CloudIcon from '@mui/icons-material/Cloud';
import { SUPPORTED_DIALECTS } from 'src/common/adapters/DataScriptFactory';
import {
  getDialectIcon
} from 'src/common/adapters/DataScriptFactory';

type ConnectionTypeIconProps = {
  dialect?: string;
  status?: string;
};

export default function ConnectionTypeIcon(props: ConnectionTypeIconProps): JSX.Element | null {
  const { dialect, status } = props;

  if (status !== 'online') {
    return <CloudIcon color='disabled' fontSize='large' />;
  }

  if (dialect && SUPPORTED_DIALECTS.indexOf(dialect) >= 0) {
    return (
      <img
        src={getDialectIcon(dialect)}
        alt={dialect}
        title={dialect}
        width={25}
        height={25}
      />
    );
  }

  return <CloudIcon color='primary' fontSize='large' />;
}
