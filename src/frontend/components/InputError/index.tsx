import {useState} from 'react';
import Box from '@mui/material/Box';

type InputErrorProps = {
  message: string;
  sx: any;
}

export default  function InputError (props: InputErrorProps)  {
  const _setCustomError = (e) => {
    e.target.setCustomValidity(props.message);
  };

  return <Box sx={{color: 'error.main', ...props.sx}}>
            {props.message}
            <input type='text' required value='' onChange={() => {}} onInvalid={_setCustomError} style={{height: 0, width: 0, borderColor: 'transparent', outline: 'none'}} />
          </Box>
}
