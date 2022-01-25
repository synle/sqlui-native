import React, { useState } from 'react';

import NewConnectionButton from 'src/components/NewConnectionButton';
import QueryBox from 'src/components/QueryBox';
import ConnectionDescription from 'src/components/ConnectionDescription';
import ResultBox from 'src/components/ResultBox';
import { useExecute } from 'src/hooks';

interface TabsProps {
  children: React.ReactNode[];
}

export default function Tabs(props: TabsProps) {
  const { children } = props;
  const [nav, ...tabs] = children;

  return (
    <section className='Tabs'>
      {nav}
      {tabs}
    </section>
  );
}
