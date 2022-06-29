import BackupIcon from '@mui/icons-material/Backup';
import { Box, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect } from 'react';
import Breadcrumbs, { BreadcrumbLink } from 'src/frontend/components/Breadcrumbs';
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

  let titleBreadcrumbs: BreadcrumbLink[] = [
    {
      label: (
        <>
          <BackupIcon fontSize='inherit' />
          Data Migration
        </>
      ),
      href: '/migration',
    },
  ];
  let contentDom = <MigrationOption />;
  if (mode === 'real_connection') {
    titleBreadcrumbs.push({ label: 'Migration of Real Existing Connection' });
    contentDom = <RealConnectionMigrationMigrationForm />;
  } else if (mode === 'raw_json') {
    titleBreadcrumbs.push({ label: 'Migration of Raw JSON Data' });
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
        <Breadcrumbs links={titleBreadcrumbs} />
        {contentDom}
      </>
    </LayoutTwoColumns>
  );
}
