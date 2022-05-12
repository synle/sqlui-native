import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Link from '@mui/material/Link';
import Tooltip from '@mui/material/Tooltip';
import {
  getSampleConnectionString,
  SUPPORTED_DIALECTS,
} from 'src/common/adapters/DataScriptFactory';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';

type ConnectionHintProps = {
  onChange: (dialect: string, connection: string) => void;
};

export default function ConnectionHint(props: ConnectionHintProps) {
  return (
    <>
      {SUPPORTED_DIALECTS.map((dialect) => {
        return (
          <Alert
            key={dialect}
            severity='info'
            icon={<ConnectionTypeIcon dialect={dialect} status='online' />}>
            <AlertTitle>{dialect}</AlertTitle>
            <Tooltip title={`Use this sample ${dialect} connection string.`}>
              <Link
                underline='hover'
                onClick={() => props.onChange(dialect, getSampleConnectionString(dialect))}>
                {getSampleConnectionString(dialect)}
              </Link>
            </Tooltip>
          </Alert>
        );
      })}
    </>
  );
}
