import React from 'react';
import Typography from '@mui/material/Typography';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Alert from '@mui/material/Alert';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetMetaData, useGetColumns, useShowHide } from 'src/hooks';
import { Sqlui } from 'typings';

type ColumnDescriptionProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function ColumnDescription(props: ColumnDescriptionProps) {
  const { databaseId, connectionId, tableId } = props;
  const { data: connections, isLoading } = useGetMetaData();
  const columns = useGetColumns(connectionId, databaseId, tableId, connections);
  const { visibles, onToggle } = useShowHide();

  if (isLoading) {
    return <>loading...</>;
  }

  if (!columns || Object.keys(columns).length === 0) {
    return <Alert severity='info'>No Available</Alert>;
  }

  return (
    <div className='ColumnDescription'>
      {Object.keys(columns).map((columnName) => {
        const column = columns[columnName];
        const key = [connectionId, databaseId, tableId, columnName].join(' > ');
        return (
          <React.Fragment key={columnName}>
            <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
              <ViewColumnIcon color='disabled' fontSize='small' />
              <span>{columnName}</span>
            </AccordionHeader>
            <AccordionBody expanded={visibles[key]}>
              <ColumnAttributes column={column} />
            </AccordionBody>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// TODO: move me to a new file
interface ColumnAttributesProps {
  column: Sqlui.Column;
}

function ColumnAttributes(props: ColumnAttributesProps) {
  const { column } = props;

  const keys = Object.keys(column);

  const attributes = keys
    .map((key) => {
      let value = column[key];

      if (value === true) {
        value = 'Yes';
      } else if (value === 'false') {
        value = 'No';
      }
      return {
        name: key,
        value: value,
      };
    })
    .filter((attribute) => !!attribute.value);

  return (
    <div className='AttributeDescription'>
      {attributes.map((attr) => (
        <div key={attr.name}>
          <div>
            <b>{attr.name}</b>
          </div>
          <div>{attr.value}</div>
        </div>
      ))}
    </div>
  );
}
