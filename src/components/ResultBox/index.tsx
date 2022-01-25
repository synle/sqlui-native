import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

interface ResultBoxProps {
  queryId: string;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryId } = props;
  const { query, isLoading: loadingQuery } = useConnectionQuery(queryId);
  const { data: queryResult, isLoading: loadingResults } = useExecute(
    query?.connectionId,
    query?.sql,
    query?.databaseId,
  );

  const isLoading = loadingQuery || loadingResults;

  if (isLoading) {
    return <>loading...</>;
  }

  if (!queryResult) {
    return <>No Data</>;
  }

  const [data] = queryResult;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
