import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect } from 'react';
import { useState } from 'react';
import React from 'react';
import { AccordionBody } from 'src/components/Accordion';
import { AccordionHeader } from 'src/components/Accordion';
import ColumnAttributes from 'src/components/ColumnDescription/ColumnAttributes';
import ColumnName from 'src/components/ColumnDescription/ColumnName';
import ColumnType from 'src/components/ColumnDescription/ColumnType';
import { useGetColumns } from 'src/hooks';
import { useShowHide } from 'src/hooks/useShowHide';

const MAX_COLUMN_SIZE_TO_SHOW = 5;

type ColumnDescriptionProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function ColumnDescription(props: ColumnDescriptionProps) {
  const [showAllColumns, setShowAllColumns] = useState(false);
  const { databaseId, connectionId, tableId } = props;
  const {
    data: columns,
    isLoading: loadingColumns,
    isError,
  } = useGetColumns(connectionId, databaseId, tableId);
  const { visibles, onToggle } = useShowHide();

  useEffect(() => {
    if (columns && columns.length < MAX_COLUMN_SIZE_TO_SHOW) {
      setShowAllColumns(true);
    }
  }, [columns]);

  const isLoading = loadingColumns;

  if (isLoading) {
    return (
      <Alert severity='info' icon={<CircularProgress size={15} />}>
        Loading...
      </Alert>
    );
  }

  if (isError) {
    return <Alert severity='error'>Error...</Alert>;
  }

  if (!columns || Object.keys(columns).length === 0) {
    return <Alert severity='warning'>Not Available</Alert>;
  }

  return (
    <>
      {columns
        .filter((column, idx) => showAllColumns || idx <= MAX_COLUMN_SIZE_TO_SHOW)
        .map((column) => {
          const key = [connectionId, databaseId, tableId, column.name].join(' > ');
          return (
            <React.Fragment key={column.name}>
              <AccordionHeader
                expanded={visibles[key]}
                onToggle={() => onToggle(key)}
                className='ColumnDescription'>
                <ViewColumnIcon color='disabled' fontSize='inherit' />
                <ColumnName value={column.name}></ColumnName>
                <ColumnType value={column.type}></ColumnType>
              </AccordionHeader>
              <AccordionBody expanded={visibles[key]}>
                <ColumnAttributes column={column} />
              </AccordionBody>
            </React.Fragment>
          );
        })}
      {!showAllColumns && (
        <div className='ShowAllColumnsButton'>
          <Button onClick={() => setShowAllColumns(true)}>Show All Columns</Button>
        </div>
      )}
    </>
  );
}
