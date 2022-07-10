import BackupIcon from '@mui/icons-material/Backup';
import LoadingButton from '@mui/lab/LoadingButton';
import { Button, Link, Skeleton, TextField, Typography } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { getBulkInsert as getBulkInsertForAzTable } from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import { getSampleSelectQuery } from 'src/common/adapters/DataScriptFactory';
import {
  getBulkInsert as getBulkInsertForRdmbs,
  getCreateTable as getCreateTableForRdbms,
} from 'src/common/adapters/RelationalDataAdapter/scripts';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import Select from 'src/frontend/components/Select';
import dataApi from 'src/frontend/data/api';
import { useGetColumns, useGetConnections, useGetConnectionById } from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore, SqluiFrontend } from 'typings';
// TOOD: extract this
type MigrationBoxProps = {
  mode: SqluiFrontend.MigrationMode;
};

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
      {/*// TODO: to be implemented*/}
      {/*<option value='cassandra'>cassandra</option>
      <option value='mongodb'>mongodb</option>
      <option value='redis'>redis</option>
      <option value='cosmosdb'>cosmosdb</option>*/}
      <option value='aztable'>aztable</option>
    </Select>
  );
}

// TOOD: extract this
async function generateMigrationScript(
  toDialect: SqluiCore.Dialect | undefined,
  toTableId: string | undefined,
  fromQuery: SqluiFrontend.ConnectionQuery,
  columns?: SqluiCore.ColumnMetaData[],
  fromDataToUse?: SqluiCore.Result,
): Promise<string | undefined> {
  if (!columns) {
    return '';
  }

  const res: string[] = [];

  const toQueryMetaData = {
    dialect: toDialect,
    databaseId: `Migrated_Database_${fromQuery.databaseId}_${Date.now()}`,
    tableId: toTableId,
    columns,
  };

  // getCreateTable
  // SqlAction.TableInput
  switch (toDialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      res.push(`-- Schema Creation Script : toDialect=${toDialect}`);
      res.push(formatSQL(getCreateTableForRdbms(toQueryMetaData)?.query || ''));
      break;
    // case 'cassandra': // TODO: to be implemented
    // case 'mongodb': // TODO: to be implemented
    // case 'redis': // TODO: to be implemented
    // case 'cosmosdb': // TODO: to be implemented
    case 'aztable':
      res.push(`// Schema Creation Script : N/A for ${toDialect}`);
      break;
  }

  // getInsert
  // first get the results
  try {
    const results = fromDataToUse || (await dataApi.execute(fromQuery));
    const hasSomeResults = results.raw && results.raw.length > 0;

    // TODO: here we need to perform the query to get the data
    switch (toDialect) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
        res.push(`-- Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatSQL(getBulkInsertForRdmbs(toQueryMetaData, results.raw)?.query || ''));
        } else {
          res.push(
            `-- The SELECT query does not have any returned that we can use for data migration...`,
          );
        }
        break;
      // case 'cassandra':// TODO: to be implemented
      // case 'mongodb':// TODO: to be implemented
      // case 'redis':// TODO: to be implemented
      // case 'cosmosdb':// TODO: to be implemented
      case 'aztable':
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatJS(getBulkInsertForAzTable(toQueryMetaData, results.raw)?.query || ''));
        } else {
          res.push(
            `// The SELECT query does not have any returned that we can use for data migration...`,
          );
        }
        break;
    }
  } catch (err) {
    return `Select query failed. ${JSON.stringify(err)}`;
  }

  if (res.length > 0) {
    return res.join('\n\n');
  }

  return 'Not Supported...';
}

function _getTypeFromObject(val: any) {
  if (val === true || val === false) {
    return 'BOOLEAN';
  }
  if (typeof val === 'string' || val instanceof String) {
    return 'TEXT';
  }
  if (typeof val === 'number') {
    if (val.toString().includes('.')) {
      return 'FLOAT';
    }
    return 'INTEGER';
  }

  return 'TEXT';
}

// main migration box
export default function MigrationBox(props: MigrationBoxProps) {
  const { mode } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const migrationMetaData = useRef<MigrationMetaData>({
    toDialect: 'sqlite',
    newTableName: `new_table_${Date.now()}`
  });
  const [query, setQuery] = useState<SqluiFrontend.ConnectionQuery>({
    id: 'migration_from_query_' + Date.now(),
    name: 'Migration Query',
  });
  const [migrationScript, setMigrationScript] = useState('');
  const [migrating, setMigrating] = useState(false);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    query?.connectionId,
    query?.databaseId,
    query?.tableId,
  );
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { onAddQuery } = useConnectionQueries();
  const [rawJson, setRawJson] = useState('');

  // TODO: pull these from the dialect
  const languageFrom = 'sql';
  const languageTo = 'sql';
  const isConnectionSelectorVisible = mode === 'real_connection';
  const isRawJsonEditorVisible = mode === 'raw_json';
  const isQueryRequired = !isRawJsonEditorVisible;
  let isDisabled = false;

  if (isRawJsonEditorVisible) {
    isDisabled = !rawJson;
  } else {
    isDisabled = !migrationMetaData.current.toDialect || !query.databaseId;
  }
  const isSaving = migrating;

  const isMigrationScriptVisible = !!migrationScript && !!migrationMetaData.current.toDialect;
  const isLoading = loadingColumns || loadingConnections;

  // effects
  useEffect(() => {
    setSearchParams(
      {
        connectionId: query.connectionId || '',
        databaseId: query.databaseId || '',
        tableId: query.tableId || '',
        toDialect: migrationMetaData.current.toDialect || 'sqlite',
      },
      { replace: true },
    );
  }, [query, migrationMetaData.current.toDialect]);

  useEffect(() => {
    setQuery({
      ...query,
      connectionId: searchParams.get('connectionId') || '',
      databaseId: searchParams.get('databaseId') || '',
      tableId: searchParams.get('tableId') || '',
    });

    migrationMetaData.current.toDialect = (searchParams.get('toDialect') as SqluiCore.Dialect) || 'sqlite'

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

  const onGenerateMigration = async () => {
    if (migrating) {
      return;
    }
    setMigrating(true);
    try {
      let newMigrationScript: string | undefined;

      if (mode === 'real_connection') {
        newMigrationScript = await generateMigrationScript(
          migrationMetaData.current.toDialect,
          migrationMetaData.current.newTableName,
          query,
          columns,
        );
      } else {
        // here we create a mocked object to handle migration
        const parsedRawJson = JSON.parse(rawJson);

        const fromQueryToUse: SqluiFrontend.ConnectionQuery = {
          id: `mocked_raw_json_query_id`,
          name: `Raw JSON Data to migrate`,
          connectionId: `mocked_raw_json_connection_id`,
          databaseId: `mocked_raw_json_database_id`,
          tableId: migrationMetaData.current.newTableName,
        };

        const columnsToUse: SqluiCore.ColumnMetaData[] = parsedRawJson.reduce((res, r) => {
          for (const key of Object.keys(r)) {
            res.push({
              name: key,
              type: _getTypeFromObject(r[key]),
              allowNull: true,
            });
          }
          return res;
        }, []);

        const dataToUse = {
          ok: true,
          raw: parsedRawJson,
        };

        newMigrationScript = await generateMigrationScript(
          migrationMetaData.current.toDialect,
          migrationMetaData.current.newTableName,
          fromQueryToUse,
          columnsToUse,
          dataToUse,
        );
      }
      setMigrationScript(newMigrationScript || '');
    } catch (err) {}
    setMigrating(false);
  };

  const onCreateMigrationQueryTab = () => {
    navigate('/');

    onAddQuery({
      name: `Migration Script for Query - ${query.databaseId} - ${query.tableId}`,
      sql: migrationScript,
    });
  };

  const onCancel = () => {
    navigate('/');
  };

  const onRawJsonChange = (newRawJson: string) => {
    setRawJson(newRawJson);
  };

  const onApplySampleQueryForMigration = () => {
    if (query) {
      const fromConnection = connections?.find(
        (connection) => connection.id === query.connectionId,
      );
      const sampleSelectQuery = getSampleSelectQuery({
        ...fromConnection,
        ...query,
        querySize: 50,
      });
      if (sampleSelectQuery?.query) {
        onSqlQueryChange(sampleSelectQuery?.query);
      }
    }
  };

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

  console.log('MigrationMetaDataInputs', migrationMetaData.current);

  return (
    <div className='FormInput__Container'>
      {isConnectionSelectorVisible && (
        <div className='FormInput__Row'>
          <ConnectionDatabaseSelector
            isTableIdRequired={true}
            value={query}
            onChange={onDatabaseConnectionChange}
          />
          <Link onClick={onApplySampleQueryForMigration}>Apply Sample Query</Link>
        </div>
      )}
      {isRawJsonEditorVisible && (
        <>
          <Typography sx={{ fontWeight: 'medium' }}>Enter Your Raw JSON for migration</Typography>
          <CodeEditorBox
            value={rawJson}
            placeholder={`Enter Your Raw JSON for migration`}
            onChange={onRawJsonChange}
            language='javascript'
            autoFocus
          />
        </>
      )}
      <div className='FormInput__Row'>
        <MigrationMetaDataInputs query={query} dataRef={migrationMetaData}/>
      </div>
      {isQueryRequired && (
        <>
          <Typography sx={{ fontWeight: 'medium' }}>Enter SQL to get Data for migration</Typography>
          <CodeEditorBox
            value={query.sql}
            placeholder={`Enter SQL for ` + query.name}
            onChange={onSqlQueryChange}
            language={languageFrom}
            autoFocus
          />
        </>
      )}
      <div className='FormInput__Row'>
        <LoadingButton
          variant='contained'
          type='submit'
          disabled={isDisabled}
          loading={isSaving}
          startIcon={<BackupIcon />}
          onClick={onGenerateMigration}>
          Migrate
        </LoadingButton>
        <Button variant='outlined' type='button' disabled={migrating} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {isMigrationScriptVisible && (
        <>
          <CodeEditorBox value={migrationScript} language={languageTo} disabled={true} />
          <div className='FormInput__Row'>
            <Button
              variant='outlined'
              type='button'
              disabled={migrating}
              onClick={onCreateMigrationQueryTab}>
              Create New Tab with This Migration Query
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

type MigrationMetaData = {
  toDialect?: SqluiCore.Dialect;
  newTableName?: string;
  azTableRowKeyField?: string;
  azTablePartitionKeyField?: string;
}

type MigrationMetaDataInputsProps = {
  query: SqluiFrontend.ConnectionQuery;
  dataRef: React.RefObject<MigrationMetaData>;
}

function MigrationMetaDataInputs(props: MigrationMetaDataInputsProps){
  const {query, dataRef: ref} = props;
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    query?.connectionId,
    query?.databaseId,
    query?.tableId,
  );

  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(query?.connectionId);

  const loading = loadingColumns || loadingConnection;

  if(!ref || !ref.current){
    return null;
  }

  if(loading){
    return null;
  }

  if(!columns || !connection){
    return null;
  }

  const dialect = connection.dialect;

  if(!dialect){
    return null;
  }

  const onSetValue = (key: string, value: any) => {
    if(ref.current){
      //@ts-ignore
      ref.current = {
        ...ref.current,
        ...{[key]: value}
      };
    }
  }

  return <>
    <DialectSelector value={ref.current?.toDialect} onChange={(newToDialect) => onSetValue('toDialect', newToDialect)} />
    <TextField
      label='New Table Name'
      defaultValue={ref.current?.newTableName}
      onBlur={(e) => onSetValue('newTableName', e.target.value)}
      required
      size='small'
      fullWidth={true}
      autoComplete='off'
    />
  </>
}
