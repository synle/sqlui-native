import DownloadIcon from '@mui/icons-material/Download';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import CsvEngine from 'json-2-csv';
import React, { useEffect, useState } from 'react';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import { DataTableWithJSONList } from 'src/frontend/components/DataTable';
import Tabs from 'src/frontend/components/Tabs';
import Timer from 'src/frontend/components/Timer';
import { downloadText } from 'src/frontend/data/file';
import { SqluiFrontend } from 'typings';
import { useCommands } from 'src/frontend/components/MissionControl';

type ResultBoxProps = {
  query: SqluiFrontend.ConnectionQuery;
  executing: boolean;
};

export default function ResultBox(props: ResultBoxProps) {
  const { selectCommand } = useCommands();
  const [tabIdx, setTabIdx] = useState(0);
  const { query, executing } = props;
  const queryResult = query.result;
  const data = queryResult?.raw;
  const error = queryResult?.error;

  if (executing) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />
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
    downloadText(
      `Result - ${new Date().toLocaleString()}.result.json`,
      JSON.stringify(data, null, 2),
      'text/json',
    );
  };

  const onDownloadCsv = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();

    CsvEngine.json2csv(data, (err, newCsv) => {
      if (!err && newCsv) {
        downloadText(`Result - ${new Date().toLocaleString()}.result.csv`, newCsv, 'text/csv');
      }
    });
  };

  const onDataRowClick = (rowData: any) => {
    selectCommand({ event: 'clientEvent/record/showDetails', data: rowData })
  }

  const tabHeaders = [
    <>
      Table{' '}
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

  const tabContents = [
    <div className='ResultBox__Content' key={`Table`}>
      <DataTableWithJSONList onRowClick={onDataRowClick} data={data} />
    </div>,
    <div className='ResultBox__Content' key={`JSON`}>
      <JsonFormatData data={data} />
    </div>,
  ];

  return (
    <div className='ResultBox'>
      <Alert severity='info'>
        Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />
      </Alert>
      <Tabs
        tabIdx={tabIdx}
        tabHeaders={tabHeaders}
        tabContents={tabContents}
        onTabChange={(newTabIdx) => setTabIdx(newTabIdx)}></Tabs>
    </div>
  );
}

type FormatDataProps = {
  data: any[];
};

function JsonFormatData(props: FormatDataProps) {
  const { data } = props;
  return <CodeEditorBox value={JSON.stringify(data, null, 2)} language='json' />;
}

function CsvFormatData(props: FormatDataProps) {
  const { data } = props;
  const [csv, setCsv] = useState('');

  useEffect(() => {
    CsvEngine.json2csv(data, (err, newCsv) => {
      if (!err && newCsv) {
        setCsv(newCsv);
      } else {
        setCsv('');
      }
    });
  }, [data]);

  return <CodeEditorBox value={csv} />;
}

type QueryTimeDescriptionProps = {
  query: SqluiFrontend.ConnectionQuery;
};

function QueryTimeDescription(props: QueryTimeDescriptionProps) {
  const { query } = props;
  return (
    <Alert severity='info'>
      Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />
    </Alert>
  );
}
