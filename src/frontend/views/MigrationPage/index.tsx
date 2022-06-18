import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import {
  RawJsonMigrationForm,
  RealConnectionMigrationMigrationForm,
} from 'src/frontend/components/MigrationForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import LayoutTwoColumns from 'src/frontend/layout/LayoutTwoColumns';
import { SqluiFrontend } from 'typings';
function MigrationOption() {
  return (
    <>
      <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
        <Typography variant='h6'>Select a migration option:</Typography>
        <Link component={RouterLink} to='/migration/real_connection'>
          <Typography>Migrate Real Existing Connections</Typography>
        </Link>
        <Link component={RouterLink} to='/migration/raw_json'>
          <Typography>Migrate Raw JSON Data</Typography>
        </Link>
        <Link component={RouterLink} to='/'>
          <Typography>Back to Main Query Page</Typography>
        </Link>
      </Box>
    </>
  );
}

type MigrationPageProps = {
  mode?: SqluiFrontend.MigrationMode;
};

export default function MigrationPage(props: MigrationPageProps) {
  const { mode } = props;
  const { setTreeActions } = useTreeActions();

  let titleDom = 'Migration';
  let contentDom = <MigrationOption />;
  if (mode === 'real_connection') {
    titleDom = 'Migration of Real Existing Connection';
    contentDom = <RealConnectionMigrationMigrationForm />;
  } else if (mode === 'raw_json') {
    titleDom = 'Migration of Raw JSON Data';
    contentDom = <RawJsonMigrationForm />;
  }

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className='MigrationPage'>
      <>
        <NewConnectionButton />
        <ConnectionDescription />
      </>
      <>
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          {titleDom}
        </Typography>
        {contentDom}
      </>
    </LayoutTwoColumns>
  );
}
