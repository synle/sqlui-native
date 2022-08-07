import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Link from '@mui/material/Link';
import { useQuery, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import React, { useCallback, useEffect, useState } from 'react';
import { getCodeSnippet } from 'src/common/adapters/DataScriptFactory';
import { BookmarksItemListModalContent } from 'src/frontend/components/BookmarksItemList';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import CommandPalette from 'src/frontend/components/CommandPalette';
import SessionSelectionForm from 'src/frontend/components/SessionSelectionForm';
import Settings, { ChangeSoftDeleteInput } from 'src/frontend/components/Settings';
import { downloadText } from 'src/frontend/data/file';
import { getRandomSessionId } from 'src/frontend/data/session';
import { useActionDialogs } from 'src/frontend/hooks/useActionDialogs';
import {
  useDeleteConnection,
  useDuplicateConnection,
  useGetConnectionById,
  useGetConnections,
  useImportConnection,
  useRetryConnection,
} from 'src/frontend/hooks/useConnection';
import {
  useActiveConnectionQuery,
  useConnectionQueries,
} from 'src/frontend/hooks/useConnectionQuery';
import { useAddBookmarkItem } from 'src/frontend/hooks/useFolderItems';
import { useGetServerConfigs } from 'src/frontend/hooks/useServerConfigs';
import {
  useCloneSession,
  useDeleteSession,
  useGetCurrentSession,
  useGetOpenedSessionIds,
  useGetSessions,
  useSelectSession,
  useUpsertSession,
} from 'src/frontend/hooks/useSession';
import { useIsSoftDeleteModeSetting, useSetting } from 'src/frontend/hooks/useSetting';
import { useShowHide } from 'src/frontend/hooks/useShowHide';
import useToaster from 'src/frontend/hooks/useToaster';
import {
  createSystemNotification,
  getExportedConnection,
  getExportedQuery,
} from 'src/frontend/utils/commonUtils';
import { execute } from 'src/frontend/utils/executeUtils';
import { RecordDetailsPage } from 'src/frontend/views/RecordPage';
import appPackage from 'src/package.json';
import { SqluiCore, SqluiEnums, SqluiFrontend } from 'typings';
 import TextField from '@mui/material/TextField';
import {
  SUPPORTED_DIALECTS,
} from 'src/common/adapters/DataScriptFactory';
import Select from 'src/frontend/components/Select';

type ConnectionHelperFormInputs = {
  scheme: string,
  username: string,
  password: string,
  host: string,
  port: string,
}

type ConnectionHelper = {
  onChange: (newConnection: string) => void;
}

export default function ConnectionHelper(props: ConnectionHelper) {
  const [value, setValue] = useState<ConnectionHelperFormInputs>({
    scheme: '',
    username: '',
    password: '',
    host: '',
    port: '',
  });


  let connection = `${value.scheme}://`;
  if(value.username && value.password){
    connection += `${value.username}:${value.password}`
  }
  connection += `@${value.host}:${value.port}`

  const onChange = (fieldKey: string, fieldValue: string) => {
    const newValue = {
      ...value,
      [fieldKey]: fieldValue
    };

    setValue(newValue);
  }

  // construct the final
  const onGenerateConnectionString = () => props.onChange(connection)

  return <form className='FormInput__Container' onSubmit={(e) => {
          e.preventDefault();
          onGenerateConnectionString();
        }}>
    <div className='FormInput__Row'>
      <Select
        required
        onChange={(newScheme) => onChange('scheme', newScheme)}
        value={value.scheme}>
        <option value=''>Select a Scheme</option>
        {
          SUPPORTED_DIALECTS.sort().map(dialect => <option key={dialect} value={dialect}>{dialect}</option>)
        }
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
        required
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
      <Button type='submit' sx={{ml: 'auto'}}>Apply</Button>
    </div>
  </form>
}
