import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import IconButton from "@mui/material/IconButton";
import { Bar, Container, Section } from "src/frontend/components/Resizer";
import { useCallback, useEffect, useState } from "react";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";

/** Props for the LayoutTwoColumns component. */
type LayoutTwoColumnsProps = {
  /** Optional CSS class name for the container. */
  className?: string;
  /** Two child elements: [0] = left pane content, [1] = right pane content. */
  children: JSX.Element[];
};

/** Style for the sidebar toggle button. */
const toggleButtonStyle = {
  position: "fixed",
  bottom: "0.5rem",
  left: "0.5rem",
  width: 24,
  height: 24,
  fontSize: "1rem",
  opacity: 0.6,
  "&:hover": { opacity: 1 },
};

/**
 * Two-column layout with a collapsible, resizable left sidebar and a main content area.
 * The left pane width is persisted via user preferences. Toggle sidebar with Cmd+\ (Mac) or Alt+\ (Windows/Linux),
 * or via the "Toggle Sidebar" command in the Command Palette, or the small arrow button at the bottom-left.
 * @param props - Contains className and two children for left and right panes.
 * @returns The two-column layout or single-column when sidebar is collapsed.
 */
export default function LayoutTwoColumns(props: LayoutTwoColumnsProps): JSX.Element | null {
  const { className = "", children } = props;
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const [leftPaneExpanded, setLeftPaneExpanded] = useState(true);

  /** Toggles the left pane expanded state. */
  const toggleLeftPane = useCallback(() => {
    setLeftPaneExpanded((prev) => !prev);
  }, []);

  useEffect(() => {
    setTreeActions({
      showContextMenu: true,
    });
  }, [setTreeActions]);

  useEffect(() => {
    /** Handles the custom toggleSidebar event dispatched by MissionControl or the Electron menu. */
    const onToggleSidebar = () => toggleLeftPane();

    document.addEventListener("toggleSidebar", onToggleSidebar);
    return () => {
      document.removeEventListener("toggleSidebar", onToggleSidebar);
    };
  }, [toggleLeftPane]);

  if (leftPaneExpanded) {
    return (
      <Container className={`${className} LayoutTwoColumns`}>
        <IconButton size="small" sx={toggleButtonStyle} onClick={() => setLeftPaneExpanded(false)}>
          <KeyboardArrowLeftIcon fontSize="small" />
        </IconButton>
        <Section defaultSize={width} onSizeChanged={onSetWidth} minSize={250} maxSize={600}>
          <div className="LayoutTwoColumns__LeftPane">{children[0]}</div>
        </Section>
        <Bar size={5} className="Resizer Resizer--Horizontal" />
        <Section>
          <div className="LayoutTwoColumns__RightPane">{children[1]}</div>
        </Section>
      </Container>
    );
  }

  return (
    <>
      <IconButton size="small" sx={toggleButtonStyle} onClick={() => setLeftPaneExpanded(true)}>
        <KeyboardArrowRightIcon fontSize="small" />
      </IconButton>
      <div className="LayoutTwoColumns__RightPane">{children[1]}</div>
    </>
  );
}
