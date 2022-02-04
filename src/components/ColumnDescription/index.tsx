import React, { useState, useEffect } from 'react';
import Typography from '@mui/material/Typography';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { styled, createTheme, ThemeProvider } from '@mui/system';
import { AccordionHeader, AccordionBody } from 'src/components/Accordion';
import { useGetColumns, useShowHide } from 'src/hooks';
import { SqluiCore } from 'typings';

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
    <div className='ColumnDescription'>
      {columns
        .filter((column, idx) => showAllColumns || idx < MAX_COLUMN_SIZE_TO_SHOW)
        .map((column) => {
          const key = [connectionId, databaseId, tableId, column.name].join(' > ');
          return (
            <React.Fragment key={column.name}>
              <AccordionHeader expanded={visibles[key]} onToggle={() => onToggle(key)}>
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
      {!showAllColumns && <Button onClick={() => setShowAllColumns(true)}>Show All Columns</Button>}
    </div>
  );
}

// TODO: move me to a new file
interface ColumnAttributesProps {
  column: SqluiCore.ColumnMetaData;
}

function ColumnAttributes(props: ColumnAttributesProps) {
  const { column } = props;

  const keys = Object.keys(column);

  const attributes = keys
    .map((key) => {
      let value = column[key];

      if (value === true) {
        value = 'Yes';
      } else if (value === false) {
        value = 'No';
      } else if (Array.isArray(value)) {
        value = JSON.stringify(value);
      } else if (value === null) {
        value = 'null';
      }

      return {
        name: key,
        value: value,
      };
    })
    .filter((attribute) => !!attribute.value);

  return (
    <StyledAttributeDescription>
      {attributes
        .filter((attr) => ['name'].indexOf(attr.name) === -1)
        .map((attr) => (
          <div key={attr.name}>
            <div className='AttributeLine'>
              <b>{attr.name}</b>
            </div>
            <Tooltip title={attr.value}>
              <div className='AttributeLine'>{attr.value}</div>
            </Tooltip>
          </div>
        ))}
    </StyledAttributeDescription>
  );
}

const StyledAttributeDescription = styled('div')(({ theme }) => {
  return {
    color: theme.palette.text.disabled,
    marginLeft: theme.spacing(1),
    fontFamily: 'monospace',

    '.AttributeLine': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  };
});

function ColumnType(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnType>{props.value}</StyledColumnType>
    </Tooltip>
  );
}

const StyledColumnType = styled('i')(({ theme }) => {
  return {
    color: theme.palette.text.disabled,
    fontFamily: 'monospace',
    paddingRight: theme.spacing(1),
    maxWidth: '50%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginLeft: 'auto',
  };
});

function ColumnName(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnName>{props.value}</StyledColumnName>
    </Tooltip>
  );
}

const StyledColumnName = styled('span')(({ theme }) => {
  return {
    maxWidth: '50%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
});
