import BackupIcon from '@mui/icons-material/Backup';
import LoadingButton from '@mui/lab/LoadingButton';
import { Button, Link, Skeleton, TextField, Typography } from '@mui/material';
import get from 'lodash.get';
import { useNavigate, useSearchParams } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import {
  getBulkInsert as getBulkInsertForCosmosDb,
  getCreateContainer as getCreateContainerForAzCosmosDb,
  getCreateDatabase as getCreateDatabaseForAzCosmosDb,
} from 'src/common/adapters/AzureCosmosDataAdapter/scripts';
import {
  getBulkInsert as getBulkInsertForAzTable,
  getCreateTable as getCreateTableForAzTable,
} from 'src/common/adapters/AzureTableStorageAdapter/scripts';
import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import {
  getBulkInsert as getBulkInsertForCassandra,
  getCreateKeyspace as getCreateKeyspaceForCassandra,
  getCreateTable as getCreateTableForCassandra,
} from 'src/common/adapters/CassandraDataAdapter/scripts';
import {
  DIALECTS_SUPPORTING_MIGRATION,
  getSampleSelectQuery,
  getSyntaxModeByDialect,
  isDialectSupportMigration,
} from 'src/common/adapters/DataScriptFactory';
import {
  getBulkInsert as getBulkInsertForMongoDB,
  getCreateCollection as getCreateCollectionForMongoDB,
  getCreateDatabase as getCreateDatabaseForMongoDB,
} from 'src/common/adapters/MongoDBDataAdapter/scripts';
import {
  getBulkInsert as getBulkInsertForRdbms,
  getCreateDatabase as getCreateDatabaseForRdbms,
  getCreateTable as getCreateTableForRdbms,
} from 'src/common/adapters/RelationalDataAdapter/scripts';
import CodeEditorBox from 'src/frontend/components/CodeEditorBox';
import ConnectionDatabaseSelector from 'src/frontend/components/QueryBox/ConnectionDatabaseSelector';
import Select from 'src/frontend/components/Select';
import dataApi from 'src/frontend/data/api';
import {
  useGetColumns,
  useGetConnectionById,
  useGetConnections,
} from 'src/frontend/hooks/useConnection';
import { useConnectionQueries } from 'src/frontend/hooks/useConnectionQuery';
import useToaster from 'src/frontend/hooks/useToaster';
import { formatJS, formatSQL } from 'src/frontend/utils/formatter';
import { SqluiCore, SqluiFrontend } from 'typings';
// TOOD: extract this
const MESSAGE_NO_DATA_FOR_MIGRATION = `Warning - This migration doesn't contain any record. This might be an error with your query to get data.`;

type MigrationBoxProps = {
  mode: SqluiFrontend.MigrationMode;
};

type DialectSelectorProps = {
  label: string;
  value?: SqluiCore.Dialect;
  onChange: (newVal: SqluiCore.Dialect) => void;
};

function DialectSelector(props: DialectSelectorProps) {
  const { label, value, onChange } = props;

  return (
    <Select
      label={label}
      value={value}
      onChange={(newValue) => onChange && onChange(newValue as SqluiCore.Dialect)}>
      {DIALECTS_SUPPORTING_MIGRATION.map((dialect) => (
        <option value={dialect}>{dialect}</option>
      ))}
    </Select>
  );
}

type ColumnSelectorProps = {
  label: string;
  value?: string;
  required?: boolean;
  onChange: (newVal: string) => void;
  columns?: SqluiCore.ColumnMetaData[];
};

function ColumnSelector(props: ColumnSelectorProps) {
  const { label, value, columns, required, onChange } = props;

  if (!columns || columns.length === 0) {
    return (
      <TextField
        label={label}
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        required={required}
        size='small'
        fullWidth={true}
        autoComplete='off'
      />
    );
  }

  return (
    <Select
      required={required}
      label={label}
      value={value}
      onChange={(newValue) => onChange && onChange(newValue)}>
      <option>Select a value</option>
      {(columns || []).map((col) => (
        <option key={col.name} value={col.name}>
          {col.name}
        </option>
      ))}
    </Select>
  );
}
// TOOD: extract this
async function generateMigrationScript(
  toDialect: SqluiCore.Dialect | undefined,
  toDatabaseId: string,
  toTableId: string | undefined,
  fromQuery: SqluiFrontend.ConnectionQuery,
  columns?: SqluiCore.ColumnMetaData[],
  fromDataToUse?: SqluiCore.Result,
  migrationMetaData?: MigrationMetaData,
): Promise<string[]> {
  if (!columns) {
    return [];
  }

  const res: string[] = [];
  const errors: string[] = [];

  const toQueryMetaData = {
    dialect: toDialect,
    databaseId: toDatabaseId,
    tableId: toTableId,
    columns,
  };

  // getCreateTable
  // SqlAction.TableInput
  const migrationInfoMessage = `toDialect=${toDialect} toDatabaseId=${toDatabaseId} toTableId=${toTableId}`;
  switch (toDialect) {
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
      res.push(`-- Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatSQL(getCreateDatabaseForRdbms(toQueryMetaData)?.query || ''));
      res.push(formatSQL(getCreateTableForRdbms(toQueryMetaData)?.query || ''));
      res.push(`USE ${toDatabaseId}`);
      break;
    case 'cassandra':
      res.push(`-- Schema Creation Script : ${migrationInfoMessage}`);

      // special type mapping for cassandra
      toQueryMetaData.columns = toQueryMetaData.columns.map((col) => {
        let type = col.type.toLowerCase();
        if (type.includes('int') || type.includes('integer')) {
          type = 'INT';
        } else if (type.includes('float')) {
          type = 'FLOAT';
        } else if (type === 'bit' || type === 'boolean') {
          type = 'BOOLEAN';
        } else {
          type = 'TEXT';
        }

        // update the type with new mappings
        col.type = type;

        return col;
      });

      res.push(formatSQL(getCreateKeyspaceForCassandra(toQueryMetaData)?.query || ''));
      res.push(formatSQL(getCreateTableForCassandra(toQueryMetaData)?.query || ''));
      break;
    case 'mongodb':
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatJS(getCreateDatabaseForMongoDB(toQueryMetaData)?.query || ''));
      res.push(formatJS(getCreateCollectionForMongoDB(toQueryMetaData)?.query || ''));
      break;
    // case 'redis': // TODO: to be implemented
    case 'cosmosdb':
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatJS(getCreateDatabaseForAzCosmosDb(toQueryMetaData)?.query || ''));
      res.push(formatJS(getCreateContainerForAzCosmosDb(toQueryMetaData)?.query || ''));
      break;
    case 'aztable':
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatJS(getCreateTableForAzTable(toQueryMetaData)?.query || ''));
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
          res.push(formatSQL(getBulkInsertForRdbms(toQueryMetaData, results.raw)?.query || ''));
        } else {
          res.push(`-- ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case 'cassandra':
        res.push(`-- Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatSQL(getBulkInsertForCassandra(toQueryMetaData, results.raw)?.query || ''));
        } else {
          res.push(`-- ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case 'mongodb':
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatJS(getBulkInsertForMongoDB(toQueryMetaData, results.raw)?.query || ''));
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      // case 'redis':// TODO: to be implemented
      case 'cosmosdb':
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatJS(getBulkInsertForCosmosDb(toQueryMetaData, results.raw)?.query || ''));
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case 'aztable':
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(
            formatJS(
              getBulkInsertForAzTable(
                toQueryMetaData,
                results.raw,
                migrationMetaData?.azTableRowKeyField,
                migrationMetaData?.azTablePartitionKeyField,
              )?.query || '',
            ),
          );
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
    }
  } catch (err) {
    errors.push(`Select query failed. ${JSON.stringify(err)}`);
  }

  return [res.join('\n\n'), errors.join('\n\n')];
}

// main migration box
export default function MigrationBox(props: MigrationBoxProps) {
  const { mode } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [migrationMetaData, setMigrationMetaData] = useState<MigrationMetaData>({
    toDialect: 'sqlite',
    newDatabaseName: `migrated_database_${Date.now()}`,
    newTableName: `new_table_${Date.now()}`,
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
  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(
    query?.connectionId,
  );
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { onAddQuery } = useConnectionQueries();
  const [rawJson, setRawJson] = useState('');
  const { add: addToast } = useToaster();

  const languageTo = getSyntaxModeByDialect(migrationMetaData?.toDialect);
  const isMigratingRealConnection = mode === 'real_connection';
  const isConnectionSelectorVisible = isMigratingRealConnection;
  const isRawJsonEditorVisible = !isMigratingRealConnection;
  const isSaving = migrating;

  const isMigrationScriptVisible = !!migrationScript && !!migrationMetaData.toDialect;
  const isLoading = loadingColumns || loadingConnections || loadingConnection;

  // effects
  // useEffect(() => {
  //   setSearchParams(
  //     {
  //       connectionId: query.connectionId || '',
  //       databaseId: query.databaseId || '',
  //       tableId: query.tableId || '',
  //       toDialect: migrationMetaData.toDialect || 'sqlite',
  //     },
  //     { replace: true },
  //   );
  // }, [query, migrationMetaData]);

  // useEffect(() => {
  //   setQuery({
  //     ...query,
  //     connectionId: searchParams.get('connectionId') || '',
  //     databaseId: searchParams.get('databaseId') || '',
  //     tableId: searchParams.get('tableId') || '',
  //   });

  //   migrationMetaData.toDialect = (searchParams.get('toDialect') as SqluiCore.Dialect) || 'sqlite';

  //   setMigrationScript('');
  // }, []);

  // useEffect(() => {
  //   if (query.sql !== migrationMetaData.selectQuery) {
  //     setQuery({
  //       ...query,
  //       sql: migrationMetaData.selectQuery,
  //     });
  //   }
  // }, [query, migrationMetaData.selectQuery]);

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

  const onGenerateMigration = async () => {
    if (migrating) {
      return;
    }
    setMigrating(true);
    const toDialect = migrationMetaData.toDialect;
    const toDatabaseId = migrationMetaData.newDatabaseName;
    const toTableId = migrationMetaData.newTableName;

    try {
      let newMigrationScript: string | undefined;
      let error: string | undefined;

      if (isMigratingRealConnection) {
        [newMigrationScript, error] = await generateMigrationScript(
          toDialect,
          toDatabaseId,
          toTableId,
          query,
          columns?.map((column) => {
            return {
              ...column,
              allowNull:
                !column.primaryKey || column.name === 'rowKey' || column.kind === 'partition_key',
            };
          }),
          undefined,
          migrationMetaData,
        );
      } else {
        // here we create a mocked object to handle migration
        const parsedRawJson = JSON.parse(rawJson);

        const fromQueryToUse: SqluiFrontend.ConnectionQuery = {
          id: `mocked_raw_json_query_id`,
          name: `Raw JSON Data to migrate`,
          connectionId: `mocked_raw_json_connection_id`,
          databaseId: `mocked_raw_json_database_id`,
          tableId: `mocked_raw_json_table_id`,
        };

        let columnsToUse = BaseDataAdapter.inferSqlTypeFromItems(parsedRawJson, toDialect).map(
          (col) => {
            return {
              ...col,
              allowNull: true,
            };
          },
        );

        const dataToUse = {
          ok: true,
          raw: parsedRawJson,
        };

        [newMigrationScript, error] = await generateMigrationScript(
          migrationMetaData.toDialect,
          toDatabaseId,
          toTableId,
          fromQueryToUse,
          columnsToUse,
          dataToUse,
          migrationMetaData,
        );
      }
      setMigrationScript(newMigrationScript || '');

      if (error) {
        await addToast({
          message: error,
        });
      }
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
      const sampleSelectQueryText = getSampleSelectQuery({
        ...fromConnection,
        ...query,
        querySize: 50,
      });
      if (sampleSelectQueryText) {
        setMigrationMetaData({
          ...migrationMetaData,
          selectQuery: sampleSelectQueryText,
        });
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

  const supportMigration = isDialectSupportMigration(connection?.dialect || '');

  if (!isRawJsonEditorVisible) {
    if (!supportMigration) {
      return (
        <div className='FormInput__Container'>
          {isConnectionSelectorVisible && (
            <div className='FormInput__Row'>
              <ConnectionDatabaseSelector
                isTableIdRequired={true}
                value={query}
                onChange={onDatabaseConnectionChange}
                required
              />
            </div>
          )}
          <Typography className='FormInput__Row' sx={{ color: 'error.main' }}>
            Migration Script is not supported for {connection?.dialect}. Please choose a different
            connection to migrate data from.
          </Typography>
        </div>
      );
    }
  }

  return (
    <form
      className='FormInput__Container'
      onSubmit={(e) => {
        e.preventDefault();
        onGenerateMigration();
      }}>
      {isConnectionSelectorVisible && (
        <div className='FormInput__Row'>
          <ConnectionDatabaseSelector
            isTableIdRequired={true}
            value={query}
            onChange={onDatabaseConnectionChange}
            required
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
            required
          />
        </>
      )}
      <MigrationMetaDataInputs
        isMigratingRealConnection={isMigratingRealConnection}
        query={query}
        value={migrationMetaData}
        onChange={setMigrationMetaData}
      />
      <div className='FormInput__Row'>
        <LoadingButton
          variant='contained'
          type='submit'
          loading={isSaving}
          startIcon={<BackupIcon />}>
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
    </form>
  );
}

type MigrationMetaData = {
  toDialect?: SqluiCore.Dialect;
  newDatabaseName: string;
  newTableName: string;
  azTableRowKeyField?: string;
  azTablePartitionKeyField?: string;
  selectQuery?: string;
};

type MigrationMetaDataInputsProps = {
  isMigratingRealConnection: boolean;
  query: SqluiFrontend.ConnectionQuery;
  value: MigrationMetaData;
  onChange: (newValue: MigrationMetaData) => void;
};

function MigrationMetaDataInputs(props: MigrationMetaDataInputsProps) {
  const { query, isMigratingRealConnection, value: migrationMetaData } = props;
  const { data: columns, isLoading: loadingColumns } = useGetColumns(
    query?.connectionId,
    query?.databaseId,
    query?.tableId,
  );
  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(
    query?.connectionId,
  );
  const loading = loadingColumns || loadingConnection;
  const isQueryRequired = isMigratingRealConnection;
  const languageFrom = getSyntaxModeByDialect(connection?.dialect);
  const onChange = (propKey: keyof MigrationMetaData, propValue: any) => {
    //@ts-ignore
    props.onChange({
      ...migrationMetaData,
      ...{ [propKey]: propValue },
    });
  };

  let extraDoms: React.ReactElement[] = [];

  let shouldShowNewDatabaseIdInput = true;
  switch (migrationMetaData.toDialect) {
    // case 'redis': // TODO: to be implemented
    case 'mysql':
    case 'mariadb':
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'cassandra':
    case 'mongodb':
    case 'cosmosdb':
    default:
      break;
    case 'aztable':
      shouldShowNewDatabaseIdInput = false;

      extraDoms.push(
        <React.Fragment key='aztable'>
          <ColumnSelector
            label='aztable rowKey'
            columns={columns}
            value={migrationMetaData.azTableRowKeyField}
            onChange={(newValue) => onChange('azTableRowKeyField', newValue)}
          />
          <ColumnSelector
            label='aztable partitionKey'
            columns={columns}
            value={migrationMetaData.azTablePartitionKeyField}
            onChange={(newValue) => onChange('azTablePartitionKeyField', newValue)}
          />
        </React.Fragment>,
      );
      break;
  }

  if (loading) {
    return null;
  }
  if (isMigratingRealConnection && (columns || []).length === 0) {
    // if it's not migrating real connection and connection is not selected, then we should show an error
    return (
      <Typography sx={{ color: 'error.main' }}>
        Connection information required to generate migration script. Please select one from the
        above.
      </Typography>
    );
  }

  return (
    <>
      <div className='FormInput__Row'>
        <DialectSelector
          label='Migrate To'
          value={migrationMetaData.toDialect}
          onChange={(newValue) => onChange('toDialect', newValue)}
        />
        {extraDoms}
      </div>

      <div className='FormInput__Row'>
        {shouldShowNewDatabaseIdInput && (
          <TextField
            label='New Database Name'
            defaultValue={migrationMetaData.newDatabaseName}
            onBlur={(e) => onChange('newDatabaseName', e.target.value)}
            required
            size='small'
            fullWidth={true}
            autoComplete='off'
          />
        )}
        <TextField
          label='New Table Name'
          defaultValue={migrationMetaData.newTableName}
          onBlur={(e) => onChange('newTableName', e.target.value)}
          required
          size='small'
          fullWidth={true}
          autoComplete='off'
        />
      </div>

      {isQueryRequired && (
        <React.Fragment key='line3'>
          <Typography sx={{ fontWeight: 'medium' }}>Enter SQL to get Data for migration</Typography>
          <CodeEditorBox
            value={migrationMetaData.selectQuery || ''}
            placeholder={`Enter SQL for ` + query.name}
            onChange={(newValue) => onChange('selectQuery', newValue)}
            language={languageFrom}
          />
        </React.Fragment>
      )}
    </>
  );
}
