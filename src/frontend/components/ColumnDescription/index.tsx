import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import React, { useEffect, useState } from 'react';
import { AccordionBody, AccordionHeader } from 'src/frontend/components/Accordion';
import ColumnAttributes from 'src/frontend/components/ColumnDescription/ColumnAttributes';
import ColumnName from 'src/frontend/components/ColumnDescription/ColumnName';
import ColumnType from 'src/frontend/components/ColumnDescription/ColumnType';
import { useGetColumns } from 'src/frontend/hooks/useConnection';
import { useShowHide } from 'src/frontend/hooks/useShowHide';
import { useActiveConnectionQuery } from 'src/frontend/hooks/useConnectionQuery';

const MAX_COLUMN_SIZE_TO_SHOW = 5;

type ColumnDescriptionProps = {
  connectionId: string;
  databaseId: string;
  tableId: string;
};

export default function ColumnDescription(props: ColumnDescriptionProps) {
  const { databaseId, connectionId, tableId } = props;
  const { query: activeQuery } = useActiveConnectionQuery();
  const {
    data: columns,
    isLoading: loadingColumns,
    isError,
  } = useGetColumns(connectionId, databaseId, tableId);
  const { visibles, onToggle } = useShowHide();
  const keyShowAllColumns = [connectionId, databaseId, tableId, '__ShowAllColumns__'].join(' > ');
  const [showAllColumns, setShowAllColumns] = useState(visibles[keyShowAllColumns]);

  const onShowAllColumns = () => {
    setShowAllColumns(true)
    onToggle(keyShowAllColumns, true);
  }

  useEffect(() => {
    if (columns && columns.length <= MAX_COLUMN_SIZE_TO_SHOW) {
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
          const isSelected = visibles[key];
          return (
            <React.Fragment key={column.name}>
              <AccordionHeader
                expanded={visibles[key]}
                onToggle={() => onToggle(key)}
                className={isSelected ? 'selected ColumnDescription' : 'ColumnDescription'}>
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
          <Button onClick={() => onShowAllColumns()}>Show All Columns</Button>
        </div>
      )}
    </>
  );
}
