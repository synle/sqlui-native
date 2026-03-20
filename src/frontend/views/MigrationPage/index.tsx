import BackupIcon from "@mui/icons-material/Backup";
import { Box, Link, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useEffect } from "react";
import Breadcrumbs, { BreadcrumbLink } from "src/frontend/components/Breadcrumbs";
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import { RawJsonMigrationForm, RealConnectionMigrationMigrationForm } from "src/frontend/components/MigrationForm";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";
import { SqluiFrontend } from "typings";
/**
 * Selection screen offering links to the two migration modes: real connection and raw JSON.
 */
function MigrationOption() {
  return (
    <>
      <Box className="FormInput__Container">
        <Typography variant="h6">Select a migration option:</Typography>
        <Link component={RouterLink} to="/migration/real_connection">
          <Typography>Migrate Real Existing Connections</Typography>
        </Link>
        <Link component={RouterLink} to="/migration/raw_json">
          <Typography>Migrate Raw JSON Data</Typography>
        </Link>
      </Box>
    </>
  );
}

/** Props for the MigrationPage component. */
type MigrationPageProps = {
  /** Migration mode: 'real_connection' for existing connections, 'raw_json' for raw data, or undefined for selection. */
  mode?: SqluiFrontend.MigrationMode;
};

/**
 * Page for data migration between databases. Shows migration mode selection or the appropriate
 * migration form based on the mode prop.
 * @param props - Contains the migration mode.
 * @returns The migration page layout.
 */
export default function MigrationPage(props: MigrationPageProps): JSX.Element | null {
  const { mode } = props;
  const { setTreeActions } = useTreeActions();

  const titleBreadcrumbs: BreadcrumbLink[] = [
    {
      label: (
        <>
          <BackupIcon fontSize="inherit" />
          Data Migration
        </>
      ),
      href: "/migration",
    },
  ];
  let contentDom = <MigrationOption />;
  if (mode === "real_connection") {
    titleBreadcrumbs.push({ label: "Migration of Real Existing Connection" });
    contentDom = <RealConnectionMigrationMigrationForm />;
  } else if (mode === "raw_json") {
    titleBreadcrumbs.push({ label: "Migration of Raw JSON Data" });
    contentDom = <RawJsonMigrationForm />;
  }

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className="Page Page__Migration">
      <>
        <NewConnectionButton />
        <VirtualizedConnectionTree />
      </>
      <>
        <Breadcrumbs links={titleBreadcrumbs} />
        {contentDom}
      </>
    </LayoutTwoColumns>
  );
}
