import QueryBox from 'src/components/QueryBox';
import ResultBox from 'src/components/ResultBox';

interface QueryResultContainerProps {
  queryId: string;
}

export default function QueryResultContainer(props: QueryResultContainerProps) {
  const { queryId } = props;

  return (
    <>
      <QueryBox queryId={queryId} />
      <ResultBox queryId={queryId} />
    </>
  );
}
