import Tooltip from '@mui/material/Tooltip';
import { styled } from '@mui/system';
import { SqluiCore } from 'typings';

type ColumnAttributesProps = {
  column: SqluiCore.ColumnMetaData;
};

export default function ColumnAttributes(props: ColumnAttributesProps): JSX.Element | null {
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
      } else if (typeof value === 'string') {
        value = value;
      } else {
        value = JSON.stringify(value, null, 2);
      }

      return {
        name: key,
        value: value,
      };
    })
    .filter((attribute) => !!attribute.value);

  return (
    <StyledAttributeDescription className='ColumnAttributes'>
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
    fontFamily: 'monospace',

    '.AttributeLine': {
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
  };
});