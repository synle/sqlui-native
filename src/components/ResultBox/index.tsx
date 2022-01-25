import React, { useState, useEffect } from 'react';
import CsvEngine from 'json-2-csv';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';
import Tabs from 'src/components/Tabs';

interface ResultBoxProps {
  queryId: string;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryId } = props;
  const { query, isLoading: loadingQuery } = useConnectionQuery(queryId);
  const [tabIdx, setTabIdx] = useState(0);

  const isLoading = loadingQuery;

  if (isLoading) {
    return <>loading...</>;
  }

  if (!query) {
    return null;
  }

  const { data: queryResult, isLoading: loadingResults } = useExecute(
    query?.connectionId,
    query?.sql,
    query?.databaseId,
    query?.lastExecuted,
  );

  if (loadingResults) {
    return <>loadingResults...</>;
  }

  if (!queryResult) {
    return null;
  }

  const [data] = queryResult;

  // return <pre>{JSON.stringify(data, null, 2)}</pre>;

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
    <div key={`JSON`}>
      <JsonFormatData data={data} />
    </div>,
    <div key={`CSV`}>
      <CsvFormatData data={data} />
    </div>,
    <div key={`Table`}>
      <TableFormatData data={data} />
    </div>,
  ];

  return <Tabs tabIdx={tabIdx} tabHeaders={tabHeaders} tabContents={tabContents}></Tabs>;
}

interface FormatDataProps {
  data: any[];
}

function JsonFormatData(props: FormatDataProps) {
  const { data } = props;
  return <pre>{JSON.stringify(data, null, 2)}</pre>;
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

  return <pre>{csv}</pre>;
}

// TODO: implement me
function TableFormatData(props: FormatDataProps) {
  const { data } = props;

  const [headers, setHeaders] = useState<string[]>([]);

  useEffect(() => {
    const newHeaders = new Set<string>();
    for(const row of data){
      for(const header of Object.keys(row)){
        newHeaders.add(header);
      }
    }
    setHeaders(Array.from(newHeaders))
  }, [data]);


  return <table>
  <thead>
    <tr>
      {headers.map(header => <th key={header}>{header}</th>)}
    </tr>
    </thead>

    <tbody>
    {
      data.map((row, idx) => <tr key={idx}>
        {headers.map(header => <td key={header}>{row[header]}</td>)}
      </tr>)
    }
    </tbody>
  </table>;
}
