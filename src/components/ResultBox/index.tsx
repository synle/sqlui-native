import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import CodeEditor from '@uiw/react-textarea-code-editor';
import CsvEngine from 'json-2-csv';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import DownloadIcon from '@mui/icons-material/Download';
import Tooltip from '@mui/material/Tooltip';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';
import Tabs from 'src/components/Tabs';
import { downloadText } from 'src/data/file';

interface ResultBoxProps {
  queryId: string;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryId } = props;
  const { query, isFetching: loadingQuery } = useConnectionQuery(queryId);
  const [tabIdx, setTabIdx] = useState(0);
  const {
    data: queryResult,
    error: queryError,
    isFetching: loadingResults,
    isError,
  } = useExecute(query);

  if (loadingQuery) {
    return <Alert severity='info'>Loading Query...</Alert>;
  }

  if (loadingResults) {
    return <Alert severity='info'>Loading Results...</Alert>;
  }

  if (isError) {
    let errorToDisplay: any = queryError;
    errorToDisplay = errorToDisplay?.original || errorToDisplay?.original || errorToDisplay;

    return (
      <>
        <Alert severity='error'>Query Error...</Alert>
        <CodeEditor
          value={JSON.stringify(errorToDisplay, null, 2)}
          language='json'
          style={{
            backgroundColor: '#f5f5f5',
            border: 'none',
            fontFamily: 'monospace',
            fontWeight: '700',
            width: '100%',
            minHeight: '200px',
            color: '#888',
            padding: '10px',
            resize: 'vertical',
          }}
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

  const [data] = queryResult;

  if (!Array.isArray(data)) {
    return (
      <div className='ResultBox'>
        <JsonFormatData data={data} />
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

    CsvEngine.json2csv(queryResult[0], (err, newCsv) => {
      if (!err && newCsv) {
        downloadText(`Result - ${new Date().toLocaleString()}.result.csv`, newCsv, 'text/csv');
      }
    });
  };

  const tabHeaders = [
    <>
      JSON
      <Tooltip title='Download Result JSON'>
        <DownloadIcon fontSize='small' onClick={onDownloadJson} />
      </Tooltip>
    </>,
    <>
      CSV{' '}
      <Tooltip title='Download Result CSV'>
        <DownloadIcon fontSize='small' onClick={onDownloadCsv} />
      </Tooltip>
    </>,
    <>Table</>,
  ];

  const tabContents = [
    <div className='ResultBox__Content' key={`JSON`}>
      <JsonFormatData data={data} />
    </div>,
    <div className='ResultBox__Content' key={`CSV`}>
      <CsvFormatData data={data} />
    </div>,
    <div className='ResultBox__Content' key={`Table`}>
      <TableFormatData data={data} />
    </div>,
  ];

  return (
    <div className='ResultBox'>
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
  return (
    <CodeEditor
      value={JSON.stringify(data, null, 2)}
      language='json'
      style={{
        backgroundColor: '#f5f5f5',
        border: 'none',
        fontFamily: 'monospace',
        fontWeight: '700',
        width: '100%',
        minWidth: '100%',
        maxWidth: '100%',
        minHeight: '200px',
        color: '#888',
        padding: '10px',
        resize: 'vertical',
      }}
    />
  );
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

  return (
    <CodeEditor
      value={csv}
      style={{
        backgroundColor: '#f5f5f5',
        border: 'none',
        fontFamily: 'monospace',
        fontWeight: '700',
        width: '100%',
        minHeight: '200px',
        color: '#888',
        padding: '10px',
        resize: 'vertical',
      }}
    />
  );
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
