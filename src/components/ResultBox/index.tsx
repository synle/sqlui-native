import React from 'react';

interface ResultBoxProps {
  queryResult?: any;
  isLoading: boolean;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryResult, isLoading } = props;

  if (isLoading) {
    return <>loading...</>;
  }

  if (!queryResult) {
    return <>No Data</>;
  }

  const [data] = queryResult;

  return <pre>{JSON.stringify(data, null, 2)}</pre>;
}
