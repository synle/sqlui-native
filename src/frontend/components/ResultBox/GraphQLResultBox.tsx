/** GraphQL response result box — displays GraphQL response in a structured format. */

import DownloadIcon from "@mui/icons-material/Download";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import React, { useState } from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import { formatBytes } from "src/frontend/components/ResultBox/RestApiResultBox";
import Tabs from "src/frontend/components/Tabs";
import Timer from "src/frontend/components/Timer";
import { downloadJSON } from "src/frontend/data/file";

/** Props for the GraphQLResultBox component. */
type GraphQLResultBoxProps = {
  /** The result metadata from the GraphQL adapter. */
  meta: Record<string, any>;
  /** Raw result data array. */
  raw: any[];
  /** Query execution start timestamp (epoch ms). */
  executionStart?: number;
  /** Query execution end timestamp (epoch ms). */
  executionEnd?: number;
};

/**
 * Returns MUI color for HTTP status code chip.
 * @param status - HTTP status code.
 * @returns MUI chip color.
 */
function getStatusColor(status: number): "success" | "warning" | "error" | "info" | "default" {
  if (status >= 200 && status < 300) return "success";
  if (status >= 300 && status < 400) return "info";
  if (status >= 400 && status < 500) return "warning";
  if (status >= 500) return "error";
  return "default";
}

/**
 * Renders a key-value table for headers or timing.
 * @param entries - Object with string keys and values.
 * @returns A styled table element.
 */
function KeyValueTable({ entries }: { entries: Record<string, any> }): JSX.Element {
  const keys = Object.keys(entries);
  if (keys.length === 0) {
    return <div style={{ padding: "0.75rem", opacity: 0.6 }}>(none)</div>;
  }
  return (
    <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.85rem" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "6px 12px 6px 0", borderBottom: "1px solid rgba(128,128,128,0.3)" }}>Name</th>
          <th style={{ textAlign: "left", padding: "6px 0", borderBottom: "1px solid rgba(128,128,128,0.3)" }}>Value</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => (
          <tr key={key}>
            <td
              style={{
                padding: "4px 12px 4px 0",
                fontWeight: 600,
                whiteSpace: "nowrap",
                verticalAlign: "top",
                borderBottom: "1px solid rgba(128,128,128,0.15)",
              }}
            >
              {key}
            </td>
            <td
              style={{
                padding: "4px 0",
                wordBreak: "break-all",
                verticalAlign: "top",
                borderBottom: "1px solid rgba(128,128,128,0.15)",
              }}
            >
              {typeof entries[key] === "object" ? JSON.stringify(entries[key]) : String(entries[key])}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Displays GraphQL execution results with tabs for Data, Errors, Headers, Request, Timing, and Raw.
 * @param props - GraphQL result metadata and timing info.
 * @returns The GraphQL result viewer.
 */
export default function GraphQLResultBox(props: GraphQLResultBoxProps): JSX.Element {
  const { meta, raw, executionStart, executionEnd } = props;

  const status: number = meta.status || 0;
  const statusText: string = meta.statusText || "";
  const timing: Record<string, number> = meta.timing || {};
  const size: number = meta.size || 0;
  const responseHeaders: Record<string, string> = meta.responseHeaders || {};
  const graphqlData = meta.graphqlData;
  const graphqlErrors: any[] = meta.graphqlErrors || [];
  const graphqlExtensions = meta.graphqlExtensions;
  const requestEndpoint: string = meta.requestEndpoint || "";
  const requestQuery: string = meta.requestQuery || "";
  const requestVariables = meta.requestVariables;
  const requestOperationName: string = meta.requestOperationName || "";
  const requestHeaders: Record<string, string> = meta.requestHeaders || {};
  const unresolvedVariables: string[] = meta.unresolvedVariables || [];

  // Auto-select Errors tab if there are errors and no data
  const hasErrors = graphqlErrors.length > 0;
  const hasNoData = graphqlData === null || graphqlData === undefined;
  const [tabIdx, setTabIdx] = useState(hasErrors && hasNoData ? 1 : 0);

  const dataText = graphqlData !== undefined && graphqlData !== null ? JSON.stringify(graphqlData, null, 2) : "(no data)";

  const errorsText = graphqlErrors.length > 0 ? JSON.stringify(graphqlErrors, null, 2) : "(no errors)";

  const headerCount = Object.keys(responseHeaders).length;
  const errorCount = graphqlErrors.length;

  /** Downloads the full response as JSON. */
  const onDownloadJson = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadJSON(`GraphQL Response - ${new Date().toLocaleString()}.json`, raw);
  };

  // Build request details text
  const requestParts: string[] = [];
  if (requestQuery) {
    requestParts.push(`# Query\n${requestQuery}`);
  }
  if (requestVariables && Object.keys(requestVariables).length > 0) {
    requestParts.push(`# Variables\n${JSON.stringify(requestVariables, null, 2)}`);
  }
  if (requestOperationName) {
    requestParts.push(`# Operation Name\n${requestOperationName}`);
  }
  if (Object.keys(requestHeaders).length > 0) {
    requestParts.push(`# Headers\n${JSON.stringify(requestHeaders, null, 2)}`);
  }
  const requestText = requestParts.join("\n\n");

  /** Formats timing values with units. */
  const timingEntries: Record<string, string> = {};
  for (const [key, val] of Object.entries(timing)) {
    timingEntries[key] = `${val} ms`;
  }

  const tabHeaders = [
    <>Data</>,
    <>Errors {errorCount > 0 && <Chip label={errorCount} size="small" color="error" sx={{ ml: 0.5, height: 18, fontSize: "0.7rem" }} />}</>,
    <>Headers {headerCount > 0 && <Chip label={headerCount} size="small" sx={{ ml: 0.5, height: 18, fontSize: "0.7rem" }} />}</>,
    <>Request</>,
    <>Timing</>,
    <>
      Raw
      <Tooltip title="Download Response JSON">
        <DownloadIcon fontSize="small" onClick={onDownloadJson} sx={{ ml: 0.5 }} />
      </Tooltip>
    </>,
  ];

  const tabContents = [
    <div className="ResultBox__Content" key="Data" style={{ padding: 0 }}>
      <CodeEditorBox value={dataText} language="json" wordWrap={true} readOnly={true} />
    </div>,
    <div className="ResultBox__Content" key="Errors" style={{ padding: 0 }}>
      <CodeEditorBox value={errorsText} language="json" wordWrap={true} readOnly={true} />
    </div>,
    <div className="ResultBox__Content" key="Headers" style={{ padding: "0.5rem" }}>
      <KeyValueTable entries={responseHeaders} />
    </div>,
    <div className="ResultBox__Content" key="Request" style={{ padding: 0 }}>
      <CodeEditorBox value={requestText} language="graphql" wordWrap={true} readOnly={true} />
    </div>,
    <div className="ResultBox__Content" key="Timing" style={{ padding: "0.5rem" }}>
      <KeyValueTable entries={timingEntries} />
      {size > 0 && (
        <div style={{ marginTop: "0.5rem", fontSize: "0.85rem" }}>
          <strong>Response Size:</strong> {formatBytes(size)}
        </div>
      )}
    </div>,
    <div className="ResultBox__Content" key="Raw">
      <CodeEditorBox value={JSON.stringify(raw, null, 2)} language="json" wordWrap={true} readOnly={true} />
    </div>,
  ];

  // Extensions info
  const extensionsAlert = graphqlExtensions ? (
    <Alert severity="info" sx={{ mb: 0.5 }}>
      Server extensions: {JSON.stringify(graphqlExtensions)}
    </Alert>
  ) : null;

  return (
    <div className="ResultBox">
      {unresolvedVariables.length > 0 && (
        <Alert severity="warning" sx={{ mb: 0.5 }}>
          Unresolved variables: {unresolvedVariables.map((v) => `{{${v}}}`).join(", ")}. Define them in collection or folder variables.
        </Alert>
      )}
      {hasErrors && !hasNoData && (
        <Alert severity="warning" sx={{ mb: 0.5 }}>
          GraphQL returned partial data with {errorCount} error{errorCount !== 1 ? "s" : ""}. Check the Errors tab for details.
        </Alert>
      )}
      {hasErrors && hasNoData && (
        <Alert severity="error" sx={{ mb: 0.5 }}>
          GraphQL returned {errorCount} error{errorCount !== 1 ? "s" : ""} with no data. Check the Errors tab for details.
        </Alert>
      )}
      {extensionsAlert}
      <Alert severity={status >= 200 && status < 400 ? "info" : "warning"} icon={false} sx={{ display: "flex", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Chip label={`${status} ${statusText}`} color={getStatusColor(status)} size="small" sx={{ fontWeight: 700 }} />
          <span style={{ fontWeight: 600 }}>POST</span>
          <span style={{ opacity: 0.8, wordBreak: "break-all" }}>{requestEndpoint}</span>
          <span style={{ opacity: 0.6 }}>
            <Timer startTime={executionStart} endTime={executionEnd} />
          </span>
          {size > 0 && <span style={{ opacity: 0.6 }}>{formatBytes(size)}</span>}
        </span>
      </Alert>
      <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents} onTabChange={(newTabIdx) => setTabIdx(newTabIdx)} />
    </div>
  );
}
