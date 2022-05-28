import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import Select from 'src/frontend/components/Select';
import { SqluiFrontend } from 'typings';


// TOOD: extract this
type DialectSelectorProps = {
  value?: string;
  onChange: (newVal: string) => void;
}

function DialectSelector(props: DialectSelectorProps){
  const {value,
    onChange,} = props;

  return (
    <Select value={value} onChange={(newValue) => onChange && onChange(newValue)}>
      <option value=''>Pick a dialect</option>
      <option value='mysql'>mysql</option>
      <option value='mariadb'>mariadb</option>
      <option value='mssql'>mssql</option>
      <option value='postgres'>postgres</option>
      <option value='sqlite'>sqlite</option>
      <option value='cassandra'>cassandra</option>
      <option value='mongodb'>mongodb</option>
      <option value='redis'>redis</option>
      <option value='cosmosdb'>cosmosdb</option>
      <option value='aztable'>aztable</option>
    </Select>
  )
}

type MigrationType = 'insert' | 'create'

type MigrationTypeSelectorProps = {
  value ?: MigrationType
  onChange: (newVal: MigrationType) => void;
}

function MigrationTypeSelector(props: MigrationTypeSelectorProps){
  const {value, onChange,} = props;

  return (
    <Select value={value} onChange={(newValue) => onChange && onChange(newValue as MigrationType)}>
      <option value=''>Pick a dialect</option>
      <option value='create'>Create Table</option>
      <option value='insert'>Insert</option>
    </Select>
  )
}

export default function MigrationBox (){
  const [query, setQuery] = useState<SqluiFrontend.ConnectionQuery>({
    id: 'migration_query_' + Date.now(),
    name: 'Migration Query'
  });
  const [migrationScript, setMigrationScript] = useState('');
  const [migrationDialect, setMigrationDialect] = useState('');
  const [migrationType, setMigrationType] = useState<MigrationType | undefined>();
  const [saving, setSaving] = useState(false);

  // TODO: pull these from the dialect
  const languageFrom = 'sql';
  const languageTo = 'sql';

  const navigate = useNavigate();

  const onDatabaseConnectionChange = (connectionId?: string, databaseId?: string) => {
    setQuery({
      ...query,
      connectionId,
      databaseId
    });

    setMigrationScript('')
  }

  const onSqlQueryChange = (sql: string) => {
    setQuery({
      ...query,
      sql
    })

    setMigrationScript('')
  }

  const onSave = async () => {
  };

  return <>
    <div>MigrationBox</div>
    <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
    <CodeEditorBox
      value={query.sql}
      placeholder={`Enter SQL for ` + query.name}
      onChange={onSqlQueryChange}
      language={languageFrom}
      autoFocus
    />
    <DialectSelector value={migrationDialect} onChange={setMigrationDialect} />
    <MigrationTypeSelector value={migrationType} onChange={setMigrationType} />
    <CodeEditorBox
      value={query.sql}
      onChange={onSqlQueryChange}
      language={languageTo}
      disabled={true}
    />
    {/*TODO: remove me*/}
    <pre>{JSON.stringify(query, null, 2)}</pre>
    <div className='FormInput__Row'>
        <Button variant='contained' type='submit' disabled={saving} startIcon={<CompareArrowsIcon />}>
          Generate Migrate
        </Button>
        <Button
          variant='outlined'
          type='button'
          disabled={saving}
          onClick={() => navigate('/')}>
          Cancel
        </Button>
      </div>
  </>
}
