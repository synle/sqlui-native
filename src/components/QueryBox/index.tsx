import { useState } from 'react';
import { useExecute, useConnectionQueries, useConnectionQuery } from 'src/hooks';

interface QueryBoxProps {
  queryId: string;
}

export default function QueryBox(props: QueryBoxProps) {
  const { queryId } = props;
  const { query, onChange, isLoading } = useConnectionQuery(queryId);

  if (isLoading) {
    return <>loading...</>;
  }

  if (!query) {
    return null;
  }

  const onExecute = () => {
    onChange('sql',query.sql + ' ')
  };

  return (
    <section className='QueryBox'>
      <div>
        <textarea defaultValue={query.sql} onBlur={(e) => onChange('sql', e.target.value)}></textarea>
      </div>
      <div>
        <button type='button' onClick={onExecute}>
          Execute
        </button>
      </div>
    </section>
  );
}
