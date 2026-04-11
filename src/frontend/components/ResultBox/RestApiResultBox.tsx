/** REST API response result box — displays HTTP response in a structured format. */

import DownloadIcon from "@mui/icons-material/Download";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Tooltip from "@mui/material/Tooltip";
import React, { useState } from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import Tabs from "src/frontend/components/Tabs";
import Timer from "src/frontend/components/Timer";
import { downloadJSON } from "src/frontend/data/file";

/** Props for the RestApiResultBox component. */
type RestApiResultBoxProps = {
  /** The result metadata from the REST API adapter. */
  meta: Record<string, any>;
  /** Raw result data array (single row with status/body/headers/etc.). */
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
 * Formats a response body for display in the code editor.
 * @param body - Parsed or raw body.
 * @returns Formatted string and language hint.
 */
function formatBody(body: any): { text: string; language: string } {
  if (body === undefined || body === null || body === "") {
    return { text: "(empty response)", language: "text" };
  }
  if (typeof body === "object") {
    return { text: JSON.stringify(body, null, 2), language: "json" };
  }
  const str = String(body);
  // Detect JSON
  if (str.trim().startsWith("{") || str.trim().startsWith("[")) {
    try {
      return { text: JSON.stringify(JSON.parse(str), null, 2), language: "json" };
    } catch (_e) {
      // not valid JSON
    }
  }
  // Detect HTML
  if (str.trim().startsWith("<")) {
    return { text: str, language: "html" };
  }
  return { text: str, language: "text" };
}

/**
 * Formats a byte count as a human-readable string (B, KB, MB).
 * @param bytes - The byte count to format.
 * @returns Human-readable size string.
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Renders a key-value table for headers, cookies, or timing.
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
 * Displays REST API execution results with tabs for Body, Headers, Cookies, and Timing.
 * @param props - REST API result metadata and timing info.
 * @returns The REST API result viewer.
 */
export default function RestApiResultBox(props: RestApiResultBoxProps): JSX.Element {
  const { meta, raw, executionStart, executionEnd } = props;
  const [tabIdx, setTabIdx] = useState(0);

  const status: number = meta.status || 0;
  const statusText: string = meta.statusText || "";
  const timing: Record<string, number> = meta.timing || {};
  const size: number = meta.size || 0;
  const responseHeaders: Record<string, string> = meta.responseHeaders || {};
  const responseCookies: Record<string, string> = meta.responseCookies || {};
  const responseBody = meta.responseBodyParsed ?? meta.responseBody ?? "";
  const requestMethod: string = meta.requestMethod || "";
  const requestUrl: string = meta.requestUrl || "";
  const unresolvedVariables: string[] = meta.unresolvedVariables || [];

  const { text: bodyText, language: bodyLanguage } = formatBody(responseBody);

  const headerCount = Object.keys(responseHeaders).length;
  const cookieCount = Object.keys(responseCookies).length;

  /** Downloads the full response as JSON. */
  const onDownloadJson = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadJSON(`Response - ${new Date().toLocaleString()}.json`, raw);
  };

  const tabHeaders = [
    <>Body</>,
    <>Headers {headerCount > 0 && <Chip label={headerCount} size="small" sx={{ ml: 0.5, height: 18, fontSize: "0.7rem" }} />}</>,
    <>Cookies {cookieCount > 0 && <Chip label={cookieCount} size="small" sx={{ ml: 0.5, height: 18, fontSize: "0.7rem" }} />}</>,
    <>Timing</>,
    <>
      Raw
      <Tooltip title="Download Response JSON">
        <DownloadIcon fontSize="small" onClick={onDownloadJson} sx={{ ml: 0.5 }} />
      </Tooltip>
    </>,
  ];

  /** Formats timing values with units. */
  const timingEntries: Record<string, string> = {};
  for (const [key, val] of Object.entries(timing)) {
    timingEntries[key] = `${val} ms`;
  }

  const tabContents = [
    <div className="ResultBox__Content" key="Body" style={{ padding: 0 }}>
      <CodeEditorBox value={bodyText} language={bodyLanguage} wordWrap={true} readOnly={true} />
    </div>,
    <div className="ResultBox__Content" key="Headers" style={{ padding: "0.5rem" }}>
      <KeyValueTable entries={responseHeaders} />
    </div>,
    <div className="ResultBox__Content" key="Cookies" style={{ padding: "0.5rem" }}>
      <KeyValueTable entries={responseCookies} />
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

  return (
    <div className="ResultBox">
      {unresolvedVariables.length > 0 && (
        <Alert severity="warning" sx={{ mb: 0.5 }}>
          Unresolved variables: {unresolvedVariables.map((v) => `{{${v}}}`).join(", ")}. Define them in collection or folder variables.
        </Alert>
      )}
      <Alert severity={status >= 200 && status < 400 ? "info" : "warning"} icon={false} sx={{ display: "flex", alignItems: "center" }}>
        <span style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Chip label={`${status} ${statusText}`} color={getStatusColor(status)} size="small" sx={{ fontWeight: 700 }} />
          <span style={{ fontWeight: 600 }}>{requestMethod}</span>
          <span style={{ opacity: 0.8, wordBreak: "break-all" }}>{requestUrl}</span>
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
