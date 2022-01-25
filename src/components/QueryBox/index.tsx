import React, { useState } from 'react';

interface QueryBoxProps {
  onExecute: (sql: string) => void;
}

export default function QueryBox(props: QueryBoxProps) {
  const [sql, setSql] = useState('');

  const onExecute = () => {
    props.onExecute(sql);
  };

  return (
    <section className='QueryBox'>
      <div>
        <textarea value={sql} onChange={(e) => setSql(e.target.value)}></textarea>
      </div>
      <div>
        <button type='button' onClick={onExecute}>
          Execute
        </button>
      </div>
    </section>
  );
}
