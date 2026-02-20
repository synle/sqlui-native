import SignalWifiStatusbar4BarIcon from "@mui/icons-material/SignalWifiStatusbar4Bar";
import { useEffect } from "react";
import Breadcrumbs from "src/frontend/components/Breadcrumbs";
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import { NewConnectionForm } from "src/frontend/components/ConnectionForm";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";

export default function NewConnectionPage() {
  useSideBarWidthPreference();

  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className="Page Page__NewConnection">
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
                  New Connection
                </>
              ),
            },
          ]}
        />
        <NewConnectionForm />
      </>
    </LayoutTwoColumns>
  );
}
