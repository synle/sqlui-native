import DownloadIcon from "@mui/icons-material/Download";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";
import React, { useState } from "react";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import { DataTableWithJSONList } from "src/frontend/components/DataTable";
import JsonFormatData from "src/frontend/components/JsonFormatData";
import { useCommands } from "src/frontend/components/MissionControl";
import Tabs from "src/frontend/components/Tabs";
import Timer from "src/frontend/components/Timer";
import { downloadCsv, downloadJSON } from "src/frontend/data/file";
import { SqluiFrontend } from "typings";

/** Props for the ResultBox component. */
type ResultBoxProps = {
  /** The query whose results are displayed. */
  query: SqluiFrontend.ConnectionQuery;
  /** Whether the query is currently executing. */
  executing: boolean;
  /** Whether the result box is in collapsed mode. */
  collapsed?: boolean;
};

/**
 * Displays query execution results as a table or JSON, with download options for CSV and JSON.
 * Shows loading state during execution and error details on failure.
 * @param props - The query, execution state, and collapse flag.
 * @returns The result display or null if no results.
 */
export default function ResultBox(props: ResultBoxProps): JSX.Element | null {
  const { selectCommand } = useCommands();
  const [tabIdx, setTabIdx] = useState(0);
  const { query, executing } = props;
  const queryResult = query.result;
  const data = queryResult?.raw;
  const error = queryResult?.error;

  if (executing) {
    return (
      <Alert severity="info" icon={<CircularProgress size={15} />}>
        Loading <Timer startTime={query?.executionStart} />
        ...
      </Alert>
    );
  }

  if (error) {
    let errorToDisplay: any = error;
    errorToDisplay = errorToDisplay?.original || errorToDisplay?.original || errorToDisplay;

    if (typeof errorToDisplay === "object") {
      errorToDisplay = JSON.stringify(errorToDisplay, null, 2);
    }

    return (
      <>
        <QueryTimeDescription query={query} />
        <CodeEditorBox value={errorToDisplay} language="json" wordWrap={true} />
      </>
    );
  }

  if (!query) {
    return null;
  }

  if (!queryResult) {
    return null;
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    // for inserts / update queries
    return (
      <div className="ResultBox">
        <QueryTimeDescription query={query} />
        <JsonFormatData data={[queryResult.raw, queryResult.meta]} />
      </div>
    );
  }

  const onDownloadJson = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadJSON(`Result - ${new Date().toLocaleString()}.result.json`, data);
  };

  const onDownloadCsv = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    downloadCsv(`Result - ${new Date().toLocaleString()}.result.csv`, data);
  };

  const onShowRecordDetails = (rowData: any) => {
    selectCommand({ event: "clientEvent/record/showDetails", data: rowData });
  };

  const executionDetails = query.executionDetails;

  const tabHeaders = [
    <>
      Table
      <Tooltip title="Download Result CSV">
        <DownloadIcon fontSize="small" onClick={onDownloadCsv} />
      </Tooltip>
    </>,
    <>
      JSON
      <Tooltip title="Download Result JSON">
        <DownloadIcon fontSize="small" onClick={onDownloadJson} />
      </Tooltip>
    </>,
    ...(executionDetails
      ? [
          <>
            <InfoOutlinedIcon fontSize="small" sx={{ mr: 0.5 }} />
            Query Details
          </>,
        ]
      : []),
  ];

  const rowContextOptions = [
    {
      label: "Show Details",
      onClick: onShowRecordDetails,
    },
    {
      label: "Show Edit Record",
      onClick: (rowData) => selectCommand({ event: "clientEvent/record/edit", data: rowData }),
    },
  ];

  const tabContents = [
    <div className="ResultBox__Content" key={`Table`}>
      <DataTableWithJSONList
        onRowClick={onShowRecordDetails}
        rowContextOptions={rowContextOptions}
        data={data}
        searchInputId="result-box-search-input"
        enableColumnFilter={true}
        description={`connectionId=${query.connectionId}\ndatabaseId=${query.databaseId}\ntableId=${query.tableId}\n\n${query.sql}`}
      />
    </div>,
    <div className="ResultBox__Content" key={`JSON`}>
      <JsonFormatData data={data} />
    </div>,
    ...(executionDetails
      ? [
          <div className="ResultBox__Content" key={`QueryDetails`}>
            <QueryDetailsPanel
              executionDetails={executionDetails}
              executionStart={query.executionStart}
              executionEnd={query.executionEnd}
            />
          </div>,
        ]
      : []),
  ];

  const snapshotInfo = query.isSnapshot ? (
    <Alert severity="warning" sx={{ mb: 0.5 }}>
      Restored snapshot — query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />.{" "}
      {query?.executionEnd ? `Originally executed on ${new Date(query.executionEnd).toLocaleString()}.` : ""}{" "}
      {data?.length > 0 ? `${data.length} records.` : ""}
    </Alert>
  ) : (
    <Alert severity="info">
      Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />.{" "}
      {data?.length > 0 ? `And it returned ${data?.length || 0} records.` : ""}
    </Alert>
  );

  return (
    <div className="ResultBox">
      {snapshotInfo}
      <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents} onTabChange={(newTabIdx) => setTabIdx(newTabIdx)}></Tabs>
    </div>
  );
}

/** Props for the QueryTimeDescription component. */
type QueryTimeDescriptionProps = {
  /** The query whose execution time is displayed. */
  query: SqluiFrontend.ConnectionQuery;
};

/**
 * Displays the execution duration of a query as an info alert.
 * @param props - Contains the query whose execution start/end times are shown.
 * @returns An alert with the query duration.
 */
function QueryTimeDescription(props: QueryTimeDescriptionProps): JSX.Element | null {
  const { query } = props;
  return (
    <Alert severity="info">
      Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />
    </Alert>
  );
}

/** Props for the QueryDetailsPanel component. */
type QueryDetailsPanelProps = {
  /** The execution details captured at query execution time. */
  executionDetails: NonNullable<SqluiFrontend.ConnectionQuery["executionDetails"]>;
  /** The execution start timestamp (epoch ms). */
  executionStart?: number;
  /** The execution end timestamp (epoch ms). */
  executionEnd?: number;
};

/**
 * Displays detailed information about the executed query including connection, database, table, timing, and the actual SQL.
 * @param props - Execution details and timing information.
 * @returns A panel showing query execution metadata and the SQL that was run.
 */
function QueryDetailsPanel(props: QueryDetailsPanelProps): JSX.Element {
  const { executionDetails, executionStart, executionEnd } = props;

  const detailRows: { label: string; value: string | undefined }[] = [
    { label: "Connection", value: executionDetails.connectionName || executionDetails.connectionId },
    { label: "Database", value: executionDetails.databaseId },
    { label: "Table", value: executionDetails.tableId },
    { label: "Executed At", value: executionStart ? new Date(executionStart).toLocaleString() : undefined },
    {
      label: "Duration",
      value: executionStart && executionEnd ? `${((executionEnd - executionStart) / 1000).toFixed(2)}s` : undefined,
    },
  ];

  return (
    <div style={{ padding: "0.75rem" }}>
      <table style={{ borderCollapse: "collapse", marginBottom: "1rem", width: "100%" }}>
        <tbody>
          {detailRows
            .filter((row) => row.value)
            .map((row) => (
              <tr key={row.label}>
                <td style={{ padding: "4px 12px 4px 0", fontWeight: 600, whiteSpace: "nowrap", verticalAlign: "top" }}>{row.label}</td>
                <td style={{ padding: "4px 0" }}>{row.value}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Executed Query</div>
      <CodeEditorBox value={executionDetails.sql || ""} language="sql" wordWrap={true} readOnly={true} />
    </div>
  );
}
