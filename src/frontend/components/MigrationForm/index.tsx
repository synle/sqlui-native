import SaveIcon from '@mui/icons-material/Save';
import {useState} from 'react';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';

export default function MigrationForm(){
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const onSave = async () => {
  };

  return <form className='ConnectionForm FormInput__Container' onSubmit={onSave}>
      <div className='FormInput__Row'>
        <Button variant='contained' type='submit' disabled={saving} startIcon={<SaveIcon />}>
          Save
        </Button>
        <Button
          variant='outlined'
          type='button'
          disabled={saving}
          onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>
    </form>
}
