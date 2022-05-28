import { useState} from 'react';
import { SqluiFrontend } from 'typings';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import ConnectionRevealButton from 'src/frontend/components/QueryBox/ConnectionRevealButton';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';

export default function MigrationBox (){
  const [query, setQuery] = useState<SqluiFrontend.ConnectionQuery>({
    id: 'migration_query_' + Date.now(),
    name: 'Migration Query'
  });

  const [migrationScript, setMigrationScript] = useState('');

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


  const language = 'sql';

  return <>
    <div>MigrationBox</div>
    <ConnectionDatabaseSelector value={query} onChange={onDatabaseConnectionChange} />
    <CodeEditorBox
      value={query.sql}
      placeholder={`Enter SQL for ` + query.name}
      onChange={onSqlQueryChange}
      language={language}
      autoFocus
    />
    <CodeEditorBox
      value={query.sql}
      placeholder={`Enter SQL for ` + query.name}
      onChange={onSqlQueryChange}
      language={language}
      autoFocus
    />
    {/*TODO: remove me*/}
    <pre>{JSON.stringify(query, null, 2)}</pre>
  </>
}
