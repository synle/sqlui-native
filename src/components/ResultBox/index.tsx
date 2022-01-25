import React from 'react';

interface ResultBoxProps {
  queryResult?: any;
}

export default function ResultBox(props: ResultBoxProps) {
  const { queryResult } = props;
  if (!queryResult) {
    return null;
  }
  return <pre>{}</pre>;
}
