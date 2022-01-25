import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

interface ResultBoxProps {
  queryId: string;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryId } = props;
  const { query, isLoading: loadingQuery } = useConnectionQuery(queryId);

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
  );

  if (loadingResults) {
    return <>loadingResults...</>;
  }

  if (!queryResult) {
    return (
      <>
        {query?.connectionId}
        <br />
        {query?.sql}
        <br />
        {query?.databaseId}
        <br />
      </>
    );
  }

  const [data] = queryResult;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
