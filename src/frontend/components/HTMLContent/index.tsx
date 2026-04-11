import React from "react";
/** Reusable component for rendering trusted HTML strings with consistent link styling. */
import Box from "@mui/material/Box";

/** Props for the HTMLContent component. */
type HTMLContentProps = {
  html: string;
};

/**
 * Renders a trusted HTML string with consistent styling for links and other HTML elements.
 * @param props - Contains the HTML string to render.
 * @returns The rendered HTML content wrapped in a Box.
 */
export default function HTMLContent(props: HTMLContentProps): React.JSX.Element {
  return (
    <Box
      component="div"
      dangerouslySetInnerHTML={{ __html: props.html }}
      sx={{ "& a": { color: "primary.main", textDecoration: "underline", cursor: "pointer" } }}
    />
  );
}
