import StarIcon from "@mui/icons-material/Star";
import Box from "@mui/material/Box";
import { useEffect } from "react";
import BookmarksItemList from "src/frontend/components/BookmarksItemList";
import Breadcrumbs from "src/frontend/components/Breadcrumbs";
import VirtualizedConnectionTree from "src/frontend/components/VirtualizedConnectionTree";
import NewConnectionButton from "src/frontend/components/NewConnectionButton";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";
import LayoutTwoColumns from "src/frontend/layout/LayoutTwoColumns";

export default function BookmarksPage() {
  useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();

  useEffect(() => {
    setTreeActions({
      showContextMenu: false,
    });
  }, [setTreeActions]);

  return (
    <LayoutTwoColumns className="Page Page__Bookmarks">
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
                  <StarIcon fontSize="inherit" />
                  Bookmarks
                </>
              ),
            },
          ]}
        />
        <Box className="FormInput__Container">
          <BookmarksItemList />
        </Box>
      </>
    </LayoutTwoColumns>
  );
}
