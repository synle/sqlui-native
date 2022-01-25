import React, { useState } from 'react';

export default function QueryBox() {
  const [sql, setSql] = useState('');

  const onExecute = () => {
    // TODO  do query
    alert(sql);
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
