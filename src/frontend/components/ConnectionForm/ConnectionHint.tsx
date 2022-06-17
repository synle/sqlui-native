import { Alert, AlertTitle, Link } from '@mui/material';
import {
  getSampleConnectionString,
  SUPPORTED_DIALECTS,
} from 'src/common/adapters/DataScriptFactory';
import ConnectionTypeIcon from 'src/frontend/components/ConnectionTypeIcon';

type ConnectionHintProps = {
  onChange: (dialect: string, connection: string) => void;
};

export default function ConnectionHint(props: ConnectionHintProps) {
  const onApplyConnectionHint = (dialect: string) => {
    props.onChange(dialect, getSampleConnectionString(dialect));
  };

  return (
    <>
      {SUPPORTED_DIALECTS.map((dialect) => {
        const onApplyThisConnectionHint = () => onApplyConnectionHint(dialect);
        return (
          <Alert
            key={dialect}
            severity='info'
            icon={
              <Link onClick={onApplyThisConnectionHint}>
                <ConnectionTypeIcon dialect={dialect} status='online' />
              </Link>
            }>
            <AlertTitle>
              <Link underline='hover' onClick={onApplyThisConnectionHint}>
                <strong>{dialect}</strong>
              </Link>
            </AlertTitle>
            <Link underline='hover' onClick={onApplyThisConnectionHint}>
              {getSampleConnectionString(dialect)}
            </Link>
          </Alert>
        );
      })}
    </>
  );
}
