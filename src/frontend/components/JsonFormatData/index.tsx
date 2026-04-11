import React from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";

/** Props for the JsonFormatData component. */
type FormatDataProps = {
  /** The data to display as formatted JSON. */
  data: unknown[] | unknown;
};

/**
 * Renders data as pretty-printed JSON in a read-only code editor.
 * @param props - Contains the data to format and display.
 * @returns A code editor box showing the JSON-formatted data.
 */
export default function JsonFormatData(props: FormatDataProps): React.JSX.Element | null {
  const { data } = props;
  return <CodeEditorBox value={JSON.stringify(data, null, 2)} language="json" readOnly={true} height="60vh" />;
}
