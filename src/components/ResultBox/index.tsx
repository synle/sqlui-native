import React, { useState, useEffect } from 'react';
import CodeEditor from '@uiw/react-textarea-code-editor';
import CsvEngine from 'json-2-csv';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';
import Tabs from 'src/components/Tabs';

interface ResultBoxProps {
  queryId: string;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryId } = props;
  const { query, isFetching: loadingQuery } = useConnectionQuery(queryId);
  const [tabIdx, setTabIdx] = useState(0);
  const { data: queryResult, isFetching: loadingResults, isError } = useExecute(query);
  const isLoading = loadingQuery;

  if (isLoading) {
    return <>loading...</>;
  }

  if (isError) {
    return <>Query error</>;
  }

  if (loadingResults) {
    return <>loadingResults...</>;
  }

  if (!query) {
    return null;
  }

  if (!queryResult) {
    return null;
  }

  const [data] = queryResult;

  // return <pre>{JSON.stringify(data, null, 2)}</pre>;

  if (!Array.isArray(data)) {
    return (
      <div className='ResultBox'>
        <JsonFormatData data={data} />
      </div>
    );
  }

  const tabHeaders = [
    <button key={0} onClick={() => setTabIdx(0)} disabled={tabIdx === 0}>
      JSON
    </button>,
    <button key={1} onClick={() => setTabIdx(1)} disabled={tabIdx === 1}>
      CSV
    </button>,
    <button key={2} onClick={() => setTabIdx(2)} disabled={tabIdx === 2}>
      Table
    </button>,
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
      <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents}></Tabs>
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
      padding={10}
      minHeight={200}
      style={{
        backgroundColor: '#f5f5f5',
        border: 'none',
        fontFamily: 'monospace',
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

  return <textarea disabled defaultValue={csv}></textarea>;
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
    <table>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header}>{header}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {data.map((row, idx) => (
          <tr key={idx}>
            {headers.map((header) => (
              <td key={header}>{row[header]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
