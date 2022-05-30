import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import { Button, Skeleton, TextField } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  getBulkInsert as getBulkInsertForRdmbs,
  getCreateTable as getCreateTableForRdbms,
} from 'src/common/adapters/RelationalDataAdapter/scripts';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import Select from 'src/frontend/components/Select';
import dataApi from 'src/frontend/data/api';
import { useGetColumns, useGetConnections } from 'src/frontend/hooks/useConnection';
import { formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore, SqluiFrontend } from 'typings';
import {
  useConnectionQueries,
} from 'src/frontend/hooks/useConnectionQuery';

// TOOD: extract this
type DialectSelectorProps = {
  value?: SqluiCore.Dialect;
  onChange: (newVal: SqluiCore.Dialect) => void;
};

function DialectSelector(props: DialectSelectorProps) {
  const { value, onChange } = props;

  return (
    <Select
      value={value}
      onChange={(newValue) => onChange && onChange(newValue as SqluiCore.Dialect)}>
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
  );
}

// TOOD: extract this
type MigrationTypeSelectorProps = {
  value?: SqluiFrontend.MigrationType;
  onChange: (newVal: SqluiFrontend.MigrationType) => void;
};

function MigrationTypeSelector(props: MigrationTypeSelectorProps) {
  const { value, onChange } = props;

  return (
    <Select
      value={value}
      onChange={(newValue) => onChange && onChange(newValue as SqluiFrontend.MigrationType)}>
      <option value='create'>Create Table</option>
      <option value='insert'>Insert Data</option>
    </Select>
  );
}

// TOOD: extract this
async function generateMigrationScript(
  migrationType: SqluiFrontend.MigrationType,
  toDialect: SqluiCore.Dialect | undefined,
  toTableId: string | undefined,
  fromQuery: SqluiFrontend.ConnectionQuery,
  columns?: SqluiCore.ColumnMetaData[],
): Promise<string | undefined> {
  if (!columns) {
    return '';
  }

  const toQueryMetaData = {
    dialect: toDialect,
    databaseId: `Migrated_Database_${fromQuery.databaseId}_${Date.now()}`,
    tableId: toTableId,
    columns,
  };

  // getCreateTable
  // SqlAction.TableInput
  if (migrationType === 'create') {
    switch (toDialect) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
        return formatSQL(getCreateTableForRdbms(toQueryMetaData)?.query || '');
        break;
      case 'cassandra':
      case 'mongodb':
      case 'redis':
      case 'cosmosdb':
      case 'aztable':
      default:
        return 'Dialect Migration not supported because this dialect is a NoSQL and does not no schema';
        break;
    }
  }

  // getInsert
  if (migrationType === 'insert') {
    // first get the results
    try {
      const results = await dataApi.execute(fromQuery);

      if (!results.raw || results.raw.length === 0) {
        return 'The SELECT query does not have any returned. You need to provide a valid SELECT query that returns some data.';
      }

      // TODO: here we need to perform the query to get the data
      let res: string[] = [];
      switch (toDialect) {
        case 'mysql':
        case 'mariadb':
        case 'mssql':
        case 'postgres':
        case 'sqlite':
          return formatSQL(getBulkInsertForRdmbs(toQueryMetaData, results.raw)?.query || '');
        case 'cassandra':
        case 'mongodb':
        case 'redis':
        case 'cosmosdb':
        case 'aztable':
        default:
          return 'Dialect Migration not yet supported';
          break;
      }
    } catch (err) {
      return `Select query failed. ${JSON.stringify(err)}`;
    }
  }

  return 'Not Supported...';
}

// main migration box
export default function MigrationBox() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState<SqluiFrontend.ConnectionQuery>({
    id: 'migration_from_query_' + Date.now(),
    name: 'Migration Query',
  });
  const [toDialect, setToDialect] = useState<SqluiCore.Dialect | undefined>();
  const [migrationNewTableName, setMigrationNewTableName] = useState(`new_table_${Date.now()}`);
  const [migrationScript, setMigrationScript] = useState('');
  const [migrationType, setMigrationType] = useState<SqluiFrontend.MigrationType>('create');
  const [migrating, setMigrating] = useState(false);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    query?.connectionId,
    query?.databaseId,
    query?.tableId,
  );
  const { isLoading: loadingConnections } = useGetConnections();
  const {
    onAddQuery,
  } = useConnectionQueries();

  // TODO: pull these from the dialect
  const languageFrom = 'sql';
  const languageTo = 'sql';
  const isQueryRequired = migrationType === 'insert';
  let isDisabled: boolean = migrating || !toDialect || !query.databaseId;

  if (isQueryRequired) {
    isDisabled = isDisabled || !query?.sql;
  }
  const isMigrationScriptVisible = !!migrationScript && !!toDialect && !!migrationType;
  const isLoading = loadingColumns || loadingConnections;

  // effects
  useEffect(() => {
    setSearchParams(
      {
        connectionId: query.connectionId || '',
        databaseId: query.databaseId || '',
        tableId: query.tableId || '',
        toDialect: toDialect || 'sqlite',
      },
      { replace: true },
    );
  }, [query, toDialect]);

  useEffect(() => {
    setQuery({
      ...query,
      connectionId: searchParams.get('connectionId') || '',
      databaseId: searchParams.get('databaseId') || '',
      tableId: searchParams.get('tableId') || '',
    });

    setToDialect(searchParams.get('toDialect') as SqluiCore.Dialect || 'sqlite');

    setMigrationScript('');
  }, []);

  // events
  const onDatabaseConnectionChange = (
    connectionId?: string,
    databaseId?: string,
    tableId?: string,
  ) => {
    setQuery({
      ...query,
      connectionId,
      databaseId,
      tableId,
    });

    setMigrationScript('');
  };

  const onSqlQueryChange = (sql: string) => {
    setQuery({
      ...query,
      sql,
    });

    setMigrationScript('');
  };

  const onSetMigrationDialect = (newVal: SqluiCore.Dialect) => {
    setToDialect(newVal);
  };

  const onSetMigrationType = (newVal: SqluiFrontend.MigrationType) => {
    setMigrationType(newVal);
  };

  const onGenerateMigration = async () => {
    if (migrating) {
      return;
    }
    setMigrating(true);
    try {
      const newMigrationScript = await generateMigrationScript(
        migrationType,
        toDialect,
        migrationNewTableName,
        query,
        columns,
      );
      setMigrationScript(newMigrationScript || '');
    } catch (err) {}
    setMigrating(false);
  };

  const onCreateMigrationQueryTab = () => {
    navigate('/');

    onAddQuery({
      name: `Migration ${migrationType} Query - ${query.databaseId} - ${query.tableId}`,
      sql: migrationScript,
    })
  }

  const onCancel = () => {
    navigate('/');
  }

  if (isLoading) {
    return (
      <div className='FormInput__Container'>
        <div className='FormInput__Row'>
          <Skeleton variant='rectangular' height={25} width={120} />
          <Skeleton variant='rectangular' height={25} width={120} />
          <Skeleton variant='rectangular' height={25} width={120} />
        </div>
        <div className='FormInput__Row'>
          <Skeleton variant='rectangular' height={25} width={120} />
          <Skeleton variant='rectangular' height={25} width={120} />
          <Skeleton variant='rectangular' height={25} width={300} />
        </div>
        <div className='FormInput__Row'>
          <Skeleton variant='rectangular' height={25} width={200} />
          <Skeleton variant='rectangular' height={25} width={120} />
        </div>
      </div>
    );
  }

  return (
    <div className='FormInput__Container'>
      <div className='FormInput__Row'>
        <ConnectionDatabaseSelector
          isTableIdRequired={true}
          value={query}
          onChange={onDatabaseConnectionChange}
        />
      </div>
      <div className='FormInput__Row'>
        <DialectSelector value={toDialect} onChange={onSetMigrationDialect} />
        <MigrationTypeSelector value={migrationType} onChange={onSetMigrationType} />
        <TextField
          label='New Table Name'
          value={migrationNewTableName}
          onChange={(e) => setMigrationNewTableName(e.target.value)}
          required
          size='small'
          fullWidth={true}
          autoComplete='off'
        />
      </div>
      {isQueryRequired && (
        <CodeEditorBox
          value={query.sql}
          placeholder={`Enter SQL for ` + query.name}
          onChange={onSqlQueryChange}
          language={languageFrom}
          autoFocus
        />
      )}
      <div className='FormInput__Row'>
        <Button
          variant='contained'
          type='submit'
          disabled={isDisabled}
          startIcon={<CompareArrowsIcon />}
          onClick={onGenerateMigration}>
          Generate Migrate
        </Button>
        <Button variant='outlined' type='button' disabled={migrating} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {isMigrationScriptVisible && (
        <>
          <CodeEditorBox value={migrationScript} language={languageTo} disabled={true} />
          <div className='FormInput__Row'>
            <Button variant='outlined' type='button' disabled={migrating} onClick={onCreateMigrationQueryTab}>
              Create New Tab with This Migration Query
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
