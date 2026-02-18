import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import Fab from "@mui/material/Fab";
import { Bar, Container, Section } from "src/frontend/components/Resizer";
import { useEffect, useState } from "react";
import { useSideBarWidthPreference } from "src/frontend/hooks/useClientSidePreference";
import { useTreeActions } from "src/frontend/hooks/useTreeActions";

type LayoutTwoColumnsProps = {
  className?: string;
  children: JSX.Element[];
};

const fabStyle = {
  position: "fixed",
  bottom: "1rem",
  left: "1.5rem",
};

export default function LayoutTwoColumns(props: LayoutTwoColumnsProps): JSX.Element | null {
  const { className = "", children } = props;
  const { value: width, onChange: onSetWidth } = useSideBarWidthPreference();
  const { setTreeActions } = useTreeActions();
  const [leftPaneExpanded, setLeftPaneExpanded] = useState(true);

  useEffect(() => {
    setTreeActions({
      showContextMenu: true,
    });
  }, [setTreeActions]);

  if (leftPaneExpanded) {
    return (
      <Container className={`${className} LayoutTwoColumns`}>
        <Fab size="small" sx={fabStyle} onClick={() => setLeftPaneExpanded(false)}>
          <KeyboardArrowLeftIcon />
        </Fab>
        <Section defaultSize={width} onSizeChanged={onSetWidth} minSize={250} maxSize={600}>
          <div className="LayoutTwoColumns__LeftPane">{children[0]}</div>
        </Section>
        <Bar size={10} className="Resizer Resizer--Horizontal" />
        <Section>
          <div className="LayoutTwoColumns__RightPane">{children[1]}</div>
        </Section>
      </Container>
    );
  }

  return (
    <>
      <Fab size="small" sx={fabStyle} onClick={() => setLeftPaneExpanded(true)}>
        <KeyboardArrowRightIcon />
      </Fab>
      <div className="LayoutTwoColumns__RightPane">{children[1]}</div>
    </>
  );
}
