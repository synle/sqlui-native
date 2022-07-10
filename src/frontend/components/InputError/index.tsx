import Box from '@mui/material/Box';

type InputErrorProps = {
  message: string;
  sx: any;
};

export default function InputError(props: InputErrorProps) {
  const _setCustomError = (e) => {
    e.target.setCustomValidity(props.message);
  };

  return (
      <input
        type='text'
        required
        value=''
        onChange={() => {}}
        onInvalid={_setCustomError}
        style={{ height: 0, width: 0, padding: 0, margin : 0, position: 'absolute', borderColor: 'transparent', outline: 'none' }}
      />
  );
}
