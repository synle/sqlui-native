/** Result viewer for file adapters, separating query output from the original file text. */

import Alert from "@mui/material/Alert";
import React, { useState } from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import Tabs from "src/frontend/components/Tabs";
import Timer from "src/frontend/components/Timer";
import { SqluiCore } from "typings";

/** Props for the file-data result viewer. */
type FileDataResultBoxProps = {
  /** Parsed query result, represented as a one-element adapter result array. */
  raw: SqluiCore.RawData;
  /** Original source text and format metadata returned by the adapter. */
  meta: { rawSource?: string; sourceFormat?: string };
  /** Query execution start timestamp in epoch milliseconds. */
  executionStart?: number;
  /** Query execution end timestamp in epoch milliseconds. */
  executionEnd?: number;
};

/**
 * Shows formatted query output and the exact original document in separate tabs.
 * @param props - Parsed result, source metadata, and execution timestamps.
 * @returns The two-tab result viewer.
 */
export default function FileDataResultBox(props: FileDataResultBoxProps): React.JSX.Element {
  const { raw, meta, executionStart, executionEnd } = props;
  const [tabIdx, setTabIdx] = useState(0);
  const resultText = JSON.stringify(raw?.[0], null, 2) ?? String(raw?.[0]);
  const sourceFormat =
    meta.sourceFormat === "jsonc" || meta.sourceFormat === "json" ? "json" : meta.sourceFormat === "xml" ? "xml" : "text";

  const tabHeaders = ["Result", "Original File"];
  const tabContents = [
    <div className="ResultBox__Content" key="Result">
      <CodeEditorBox value={resultText} language="json" wordWrap={true} readOnly={true} />
    </div>,
    <div className="ResultBox__Content" key="OriginalFile">
      <CodeEditorBox value={meta.rawSource || ""} language={sourceFormat} wordWrap={true} readOnly={true} />
    </div>,
  ];

  return (
    <div className="ResultBox">
      <Alert severity="info" icon={false}>
        Query took <Timer startTime={executionStart} endTime={executionEnd} />.
      </Alert>
      <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents} onTabChange={setTabIdx} />
    </div>
  );
}
