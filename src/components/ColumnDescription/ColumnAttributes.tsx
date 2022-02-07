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
import ColumnName from 'src/components/ColumnDescription/ColumnName';
import ColumnType from 'src/components/ColumnDescription/ColumnType';

interface ColumnAttributesProps {
  column: SqluiCore.ColumnMetaData;
}

export default function ColumnAttributes(props: ColumnAttributesProps) {
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

