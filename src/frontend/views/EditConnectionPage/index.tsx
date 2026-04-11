import SignalWifiStatusbar4BarIcon from "@mui/icons-material/SignalWifiStatusbar4Bar";
import { useParams } from "react-router";
import { useEffect } from "react";
import Breadcrumbs from "src/frontend/components/Breadcrumbs";
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import { EditConnectionForm } from "src/frontend/components/ConnectionForm";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";

/**
 * Page for editing an existing database connection's properties.
 * Reads the connectionId from URL params.
 */
export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: true,
    });
  }, [setTreeActions]);

  if (!connectionId) {
    return null;
  }

  return (
    <LayoutTwoColumns className="Page Page__EditConnection">
      <>
        <NewConnectionButton />
        <VirtualizedConnectionTree />
      </>
      <>
        <Breadcrumbs
          links={[
            {
              label: (
                <>
                  <SignalWifiStatusbar4BarIcon fontSize="inherit" />
                  Edit Connection
                </>
              ),
            },
          ]}
        />
        <EditConnectionForm id={connectionId} />
      </>
    </LayoutTwoColumns>
  );
}
