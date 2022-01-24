import React from 'react';

type ConnectionFormProps = {
  id?: string;
};

export default function ConnectionForm(props: ConnectionFormProps) {
  return <div>ConnectionForm {props.id}</div>;
}
