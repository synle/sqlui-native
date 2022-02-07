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

const StyledColumnName = styled('span')(({ theme }) => {
  return {
    maxWidth: '50%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };
});


export default  function ColumnName(props: { value: string }) {
  return (
    <Tooltip title={props.value}>
      <StyledColumnName>{props.value}</StyledColumnName>
    </Tooltip>
  );
}
