import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { useState } from 'react';
import { SUPPORTED_DIALECTS } from 'src/common/adapters/DataScriptFactory';
import Select from 'src/frontend/components/Select';

type ConnectionHelperFormInputs = {
  scheme: string;
  username: string;
  password: string;
  host: string;
  port: string;
  restOfConnectionString: string;
};

type ConnectionHelper = ConnectionHelperFormInputs & {
  onChange: (newConnection: string) => void;
};

export default function ConnectionHelper(props: ConnectionHelper) {
  const [value, setValue] = useState<ConnectionHelperFormInputs>({
    scheme: props.scheme || '',
    username: props.username || '',
    password: props.password || '',
    host: props.host || '',
    port: props.port || '',
    restOfConnectionString: props.restOfConnectionString || '',
  });

  let connection = `${value.scheme}://`;

  const onChange = (fieldKey: string, fieldValue: string) => {
    const newValue = {
      ...value,
      [fieldKey]: fieldValue,
    };

    setValue(newValue);
  };

  // construct the final
  const onGenerateConnectionString = () => props.onChange(connection);

  let formDom;
  switch(value.scheme){
    case 'aztable':
    case 'cosmosdb':
    connection += `${value.restOfConnectionString}`;

    debugger

    formDom= <>
      <div className='FormInput__Row'>
        <TextField
          label='Primary Connection String'
          value={value.restOfConnectionString}
          onChange={(e) => onChange('restOfConnectionString', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
    </>
      break;
    default:
    if (value.username && value.password) {
      connection += `${value.username}:${value.password}`;
    }
    connection += `@${value.host}`;
    if (value.port) {
      connection += `${value.port}`;
    }

    formDom = <>
      <div className='FormInput__Row'>
        <TextField
          label='Username'
          value={value.username}
          onChange={(e) => onChange('username', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Password'
          value={value.password}
          onChange={(e) => onChange('password', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Host'
          value={value.host}
          onChange={(e) => onChange('host', e.target.value)}
          required
          size='small'
          fullWidth={true}
        />
      </div>
      <div className='FormInput__Row'>
        <TextField
          label='Port'
          value={value.port}
          onChange={(e) => onChange('port', e.target.value)}
          size='small'
          fullWidth={true}
          type='number'
        />
      </div>
      </>
      break;
  }

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
      <div>
        <Button type='submit' sx={{ ml: 'auto' }}>
          Apply
        </Button>
      </div>
    </form>
  );
}
