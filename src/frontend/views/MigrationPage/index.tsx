import {Typography, Box, Link} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useEffect } from 'react';
import ConnectionDescription from 'src/frontend/components/ConnectionDescription';
import {RealConnectionMigrationMigrationForm, RawJsonMigrationForm} from 'src/frontend/components/MigrationForm';
import NewConnectionButton from 'src/frontend/components/NewConnectionButton';
import Resizer from 'src/frontend/components/Resizer';
import { useSideBarWidthPreference } from 'src/frontend/hooks/useClientSidePreference';
import { useTreeActions } from 'src/frontend/hooks/useTreeActions';
import { SqluiFrontend } from 'typings';

function MigrationOption(){
  return <>
    <Box>
      <Link component={RouterLink} to="/migration/real_connection"><Typography>Migrate Real Connections</Typography></Link>
      <Link component={RouterLink} to="/migration/raw_json"><Typography>Migrate Raw JSON</Typography></Link>
    </Box>
  </>
}

type MigrationPageProps = {
  mode?: SqluiFrontend.MigrationMode;
}

export default function MigrationPage(props: MigrationPageProps) {
  const {mode} = props;
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  let contentDom = <MigrationOption />
  if(mode === 'real_connection'){
    contentDom = <RealConnectionMigrationMigrationForm />
  } else if(mode ===  'raw_json'){
    contentDom = <RawJsonMigrationForm />
  }

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <section className='MigrationPage LayoutTwoColumns'>
      <div className='LayoutTwoColumns__LeftPane' style={{ width }}>
        <NewConnectionButton />
        <ConnectionDescription />
      </div>
      <Resizer onSetWidth={onSetWidth} />
      <div className='LayoutTwoColumns__RightPane'>
        <Typography variant='h5' gutterBottom={true} sx={{ mt: 1 }}>
          Migration
        </Typography>
        {contentDom}
      </div>
    </section>
  );
}
