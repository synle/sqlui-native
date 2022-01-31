import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import CsvEngine from 'json-2-csv';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import DownloadIcon from '@mui/icons-material/Download';
import Tooltip from '@mui/material/Tooltip';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';
import Tabs from 'src/components/Tabs';
import { downloadText } from 'src/data/file';
import CodeEditorBox from 'src/components/CodeEditorBox';
import Timer from 'src/components/Timer';
import { SqluiCore, SqluiFrontend } from 'typings';

interface ResultBoxProps {
  query: SqluiFrontend.ConnectionQuery;
  executing: boolean;
}

export default function ResultBox(props: ResultBoxProps) {
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

    return (
      <>
        <QueryTimeDescription query={query} />
        <CodeEditorBox
          value={JSON.stringify(errorToDisplay, null, 2)}
          language='json'
          mode='textarea'
        />
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
      <TableFormatData data={data} />
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

interface FormatDataProps {
  data: any[];
}

function JsonFormatData(props: FormatDataProps) {
  const { data } = props;
  return <CodeEditorBox value={JSON.stringify(data, null, 2)} language='json' mode='textarea' />;
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

  return <CodeEditorBox value={csv} mode='textarea' />;
}

function TableFormatData(props: FormatDataProps) {
  const { data } = props;

  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    const newHeaders = new Set<string>();
    for (const row of data) {
      for (const header of Object.keys(row)) {
        newHeaders.add(header);
      }
    }
    setHeaders(Array.from(newHeaders));
  }, [data]);

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} size='small'>
        <TableHead>
          <TableRow>
            {headers.map((header) => (
              <TableCell key={header}>{header}</TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {data.map((row, idx) => (
            <TableRow key={idx}>
              {headers.map((header) => (
                <TableCell key={header}>{row[header]}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

interface QueryTimeDescriptionProps {
  query: SqluiFrontend.ConnectionQuery;
}

function QueryTimeDescription(props: QueryTimeDescriptionProps) {
  const { query } = props;
  return (
    <Alert severity='info'>
      Query took <Timer startTime={query?.executionStart} endTime={query?.executionEnd} />
    </Alert>
  );
}
