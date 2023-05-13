import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import React, { useState } from 'react';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import JsonFormatData from 'src/frontend/components/JsonFormatData';
import { useCommands } from 'src/frontend/components/MissionControl';
import Tabs from 'src/frontend/components/Tabs';
import Timer from 'src/frontend/components/Timer';
import { downloadCsv, downloadJSON } from 'src/frontend/data/file';
import { SqluiFrontend } from 'typings';

type ResultBoxProps = {
  query: SqluiFrontend.ConnectionQuery;
  executing: boolean;
};

export default function ResultBox(props: ResultBoxProps): JSX.Element | null {
  const { selectCommand } = useCommands();
  const [tabIdx, setTabIdx] = useState(0);
  const { query, executing } = props;
  const queryResult = query.result;
  const data = queryResult?.raw;
  const error = queryResult?.error;

  if (executing) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading <Timer startTime={query?.executionStart} />
        ...
      </Alert>
    );
  }

  if (error) {
    let errorToDisplay: any = error;
    errorToDisplay = errorToDisplay?.original || errorToDisplay?.original || errorToDisplay;

    if (typeof errorToDisplay === 'object') {
      errorToDisplay = JSON.stringify(errorToDisplay, null, 2);
    }

    return (
      <>
        <QueryTimeDescription query={query} />
        <CodeEditorBox value={errorToDisplay} language='json' wordWrap={true} />
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
      <div className='ResultBox'>
        <QueryTimeDescription query={query} />
        <JsonFormatData data={[queryResult.raw, queryResult.meta]} />
      </div>
    );
  }

  const onDownloadJson = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
    downloadJSON(
      `Result - ${new Date().toLocaleString()}.result.json`,
      JSON.stringify(data, null, 2),
    );
  };

  const onDownloadCsv = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    downloadCsv(`Result - ${new Date().toLocaleString()}.result.csv`, data);
  };

  const onShowRecordDetails = (rowData: any) => {
    selectCommand({ event: 'clientEvent/record/showDetails', data: rowData });
  };

  const tabHeaders = [
    <>
      Table
      <Tooltip title='Download Result CSV'>
        <DownloadIcon fontSize='small' onClick={onDownloadCsv} />
      </Tooltip>
    </>,
    <>
      JSON
      <Tooltip title='Download Result JSON'>
        <DownloadIcon fontSize='small' onClick={onDownloadJson} />
      </Tooltip>
    </>,
  ];

  const rowContextOptions = [
    {
      label: 'Show Details',
      onClick: onShowRecordDetails,
    },
    {
      label: 'Show Edit Record',
      onClick: (rowData) => selectCommand({ event: 'clientEvent/record/edit', data: rowData }),
    },
  ];

  const tabContents = [
    <div className='ResultBox__Content' key={`Table`}>
      <DataTableWithJSONList
        onRowClick={onShowRecordDetails}
        rowContextOptions={rowContextOptions}
        data={data}
        searchInputId='result-box-search-input'
        enableColumnFilter={true}
        description={`connectionId=${query.connectionId}\ndatabaseId=${query.databaseId}\ntableId=${query.tableId}\n\n${query.sql}`}
      />
    </div>,
    <div className='ResultBox__Content' key={`JSON`}>
      <JsonFormatData data={data} />
    </div>,
  ];

  return (
    <div className='ResultBox'>
      <Alert severity='info'>
        Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />.{' '}
        {data?.length > 0 ? `And it returned ${data?.length || 0} records.` : ''}
      </Alert>
      <Tabs
        tabIdx={tabIdx}
        tabHeaders={tabHeaders}
        tabContents={tabContents}
        onTabChange={(newTabIdx) => setTabIdx(newTabIdx)}></Tabs>
    </div>
  );
}

type QueryTimeDescriptionProps = {
  query: SqluiFrontend.ConnectionQuery;
};

function QueryTimeDescription(props: QueryTimeDescriptionProps): JSX.Element | null {
  const { query } = props;
  return (
    <Alert severity='info'>
      Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />
    </Alert>
  );
}
