import Button from '@mui/material/Button';
import { useState } from 'react';
import { SUPPORTED_DIALECTS } from 'src/common/adapters/DataScriptFactory';
import Select from 'src/frontend/components/Select';
import TextField from '@mui/material/TextField';

type ConnectionHelperFormInputs = {
  scheme: string;
  username: string;
  password: string;
  host: string;
  port: string;
};

type ConnectionHelper = {
  scheme: string;
  username: string;
  password: string;
  host: string;
  port: string;
  onChange: (newConnection: string) => void;
};

export default function ConnectionHelper(props: ConnectionHelper) {
  const [value, setValue] = useState<ConnectionHelperFormInputs>({
    scheme: props.scheme || '',
    username: props.username || '',
    password: props.password || '',
    host: props.host || '',
    port: props.port || '',
  });
  let connection = `${value.scheme}://`;
  if (value.username && value.password) {
    connection += `${value.username}:${value.password}`;
  }
  connection += `@${value.host}`;
  if(value.port){
    connection += `${value.port}`;
  }

  const onChange = (fieldKey: string, fieldValue: string) => {
    const newValue = {
      ...value,
      [fieldKey]: fieldValue,
    };

    setValue(newValue);
  };

  // construct the final
  const onGenerateConnectionString = () => props.onChange(connection);

  return (
    <form
      className='FormInput__Container'
      onSubmit={(e) => {
        e.preventDefault();
        onGenerateConnectionString();
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
      <div className='FormInput__Row'>
        <TextField
          label='Username'
          defaultValue={value.username}
          onChange={(e) => onChange('username', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Password'
          defaultValue={value.password}
          onChange={(e) => onChange('password', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Host'
          defaultValue={value.host}
          onChange={(e) => onChange('host', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Port'
          defaultValue={value.port}
          onChange={(e) => onChange('port', e.target.value)}
          size='small'
          fullWidth={true}
          type='number'
        />
      </div>
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
      <div>
        <Button type='submit' sx={{ ml: 'auto' }}>
          Apply
        </Button>
      </div>
    </form>
  );
}
