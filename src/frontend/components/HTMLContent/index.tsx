import React from "react";
/** Reusable component for rendering HTML strings with consistent link styling. */
import Box from "@mui/material/Box";
import { sanitizeHtml } from "src/frontend/utils/sanitizeHtml";

/** Props for the HTMLContent component. */
type HTMLContentProps = {
  html: string;
};

/**
 * Renders an HTML string with consistent styling for links and other HTML elements.
 * The markup is sanitized before injection so the component stays safe if a caller
 * ever passes content derived from a database or other untrusted source.
 * @param props - Contains the HTML string to render.
 * @returns The rendered HTML content wrapped in a Box.
 */
export default function HTMLContent(props: HTMLContentProps): React.JSX.Element {
  return (
    <Box
      component="div"
      dangerouslySetInnerHTML={{ __html: sanitizeHtml(props.html) }}
      sx={{ "& a": { color: "primary.main", textDecoration: "underline", cursor: "pointer" } }}
    />
  );
}
