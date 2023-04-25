import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { getConnectionFormInputs, SUPPORTED_DIALECTS } from 'src/common/adapters/DataScriptFactory';
import Select from 'src/frontend/components/Select';

type ConnectionHelperFormInputs = {
  scheme: string;
  username: string;
  password: string;
  host: string;
  port: string;
  restOfConnectionString: string;
};

type ConnectionHelperProps = ConnectionHelperFormInputs & {
  onChange: (newConnection: string) => void;
  onClose: () => void;
};

export default function ConnectionHelper(props: ConnectionHelperProps) {
  const [value, setValue] = useState<ConnectionHelperFormInputs>({
    scheme: props.scheme || '',
    username: props.username || '',
    password: props.password || '',
    host: props.host || '',
    port: props.port || '',
    restOfConnectionString: props.restOfConnectionString || '',
  });

  const formInputs = getConnectionFormInputs(value.scheme);

  let connection = `${value.scheme}://`;
  if (formInputs.length === 1) {
    connection += `${value[formInputs[0][0]]}`;
  } else {
    if (value.username && value.password) {
      connection += `${encodeURIComponent(value.username)}:${encodeURIComponent(value.password)}`;
    }
    connection += `@${value.host}`;
    if (value.port) {
      connection += `:${value.port}`;
    }
  }

  const onChange = (fieldKey: string, fieldValue: string) => {
    const newValue = {
      ...value,
      [fieldKey]: fieldValue,
    };

    setValue(newValue);
  };

  // construct the final
  const onApply = () => props.onChange(connection);

  const formDom =
    formInputs.length === 0 ? (
      <div className='FormInput__Row'>
        This database scheme is not supported by the connection helper
      </div>
    ) : (
      formInputs.map(([inputKey, inputLabel, optionalFlag], idx) => {
        const isRequired = optionalFlag !== 'optional';
        return (
          <div className='FormInput__Row' key={idx + inputKey}>
            <TextField
              label={inputLabel}
              value={value[inputKey]}
              onChange={(e) => onChange(inputKey, e.target.value)}
              required={isRequired}
              size='small'
              fullWidth={true}
            />
          </div>
        );
      })
    );

  return (
    <form
      className='FormInput__Container'
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}>
      <div className='FormInput__Row'>
        <Select
          required
          onChange={(newScheme) => onChange('scheme', newScheme)}
          value={value.scheme}>
          <option value=''>Select a Scheme</option>
          {SUPPORTED_DIALECTS.sort().map((dialect) => (
            <option key={dialect} value={dialect}>
              {dialect}
            </option>
          ))}
        </Select>
      </div>
      {formDom}
      <div className='FormInput__Row'>
        <TextField
          label='Generated Connection String'
          value={connection}
          disabled={true}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <Box sx={{ display: 'flex', justifyContent: 'end', gap: 2 }}>
        <Button type='submit' variant='contained'>
          Apply
        </Button>
        <Button type='button' onClick={props.onClose}>
          Cancel
        </Button>
      </Box>
    </form>
  );
}