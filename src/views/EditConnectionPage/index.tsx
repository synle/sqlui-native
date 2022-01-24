import React from 'react';
import { useParams } from 'react-router-dom';
import ConnectionForm from 'src/components/ConnectionForm';

export default function EditConnectionPage() {
  const urlParams = useParams();
  const connectionId = urlParams.connectionId as string;

  if (!connectionId) {
    return null;
  }

  return (
    <div>
      EditConnectionPage
      <ConnectionForm id={connectionId} />
    </div>
  );
}
