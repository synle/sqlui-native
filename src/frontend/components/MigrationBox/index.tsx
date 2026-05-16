import BackupIcon from "@mui/icons-material/Backup";
import LoadingButton from "@mui/lab/LoadingButton";
import { Button, Checkbox, FormControlLabel, Link, Skeleton, TextField, Typography } from "@mui/material";
import { useSearchParams } from "react-router";
import { useNavigate } from "src/frontend/utils/commonUtils";
import React, { useEffect, useState } from "react";
import {
  getBulkInsert as getBulkInsertForCosmosDb,
  getCreateContainer as getCreateContainerForAzCosmosDb,
  getCreateDatabase as getCreateDatabaseForAzCosmosDb,
} from "src/common/adapters/AzureCosmosDataAdapter/scripts";
import {
  getBulkInsert as getBulkInsertForAzTable,
  getCreateTable as getCreateTableForAzTable,
} from "src/common/adapters/AzureTableStorageAdapter/scripts";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import {
  getBulkInsert as getBulkInsertForCassandra,
  getCreateKeyspace as getCreateKeyspaceForCassandra,
  getCreateTable as getCreateTableForCassandra,
} from "src/common/adapters/CassandraDataAdapter/scripts";
import {
  DIALECTS_SUPPORTING_MIGRATION,
  getDialectName,
  getSampleSelectQuery,
  getSyntaxModeByDialect,
  isDialectSupportMigration,
} from "src/common/adapters/DataScriptFactory";
import {
  getBulkInsert as getBulkInsertForMongoDB,
  getCreateCollection as getCreateCollectionForMongoDB,
  getCreateDatabase as getCreateDatabaseForMongoDB,
} from "src/common/adapters/MongoDBDataAdapter/scripts";
import {
  getBulkInsert as getBulkInsertForRdbms,
  getBulkUpsert as getBulkUpsertForRdbms,
  getCreateDatabase as getCreateDatabaseForRdbms,
  getCreateTable as getCreateTableForRdbms,
  getForeignKeyToggle as getForeignKeyToggleForRdbms,
} from "src/common/adapters/RelationalDataAdapter/scripts";
import { getBulkInsert as getBulkInsertForSalesforce } from "src/common/adapters/SalesforceDataAdapter/scripts";
import CodeEditorBox from "src/frontend/components/CodeEditorBox";
import ConnectionDatabaseSelector from "src/frontend/components/QueryBox/ConnectionDatabaseSelector";
import Select from "src/frontend/components/Select";
import dataApi from "src/frontend/data/api";
import { useGetColumns, useGetConnectionById, useGetConnections } from "src/frontend/hooks/useConnection";
import { useConnectionQueries } from "src/frontend/hooks/useConnectionQuery";
import useToaster from "src/frontend/hooks/useToaster";
import { formatJS, formatSQL } from "src/frontend/utils/formatter";
import { SqluiCore, SqluiFrontend } from "typings";
// TOOD: extract this
const MESSAGE_NO_DATA_FOR_MIGRATION = `Warning - This migration doesn't contain any record. This might be an error with your query to get data.`;

/** Props for the MigrationBox component. */
type MigrationBoxProps = {
  /** The migration mode: "real_connection" for live DB or "raw_json" for pasted JSON data. */
  mode: SqluiFrontend.MigrationMode;
};

/** Props for the DialectSelector component. */
type DialectSelectorProps = {
  /** Label text for the select field. */
  label: string;
  /** Currently selected dialect. */
  value?: SqluiCore.Dialect;
  /** Callback when a new dialect is selected. */
  onChange: (newVal: SqluiCore.Dialect) => void;
};

/**
 * A dropdown selector for choosing a target database dialect for migration.
 * @param props - Contains label, current value, and onChange callback.
 * @returns A select element with supported migration dialects.
 */
function DialectSelector(props: DialectSelectorProps): React.JSX.Element | null {
  const { label, value, onChange } = props;

  return (
    <Select label={label} value={value} onChange={(newValue) => onChange && onChange(newValue as SqluiCore.Dialect)}>
      {DIALECTS_SUPPORTING_MIGRATION.map((dialect) => (
        <option value={dialect}>{getDialectName(dialect)}</option>
      ))}
    </Select>
  );
}

/** Props for the ColumnSelector component. */
type ColumnSelectorProps = {
  /** Label text for the input/select field. */
  label: string;
  /** Currently selected column name. */
  value?: string;
  /** Whether the field is required. */
  required?: boolean;
  /** Callback when a column is selected or typed. */
  onChange: (newVal: string) => void;
  /** Available columns to choose from; falls back to a text input if empty. */
  columns?: SqluiCore.ColumnMetaData[];
};

/**
 * A selector for choosing a column, either from a dropdown of available columns
 * or a free-text input if no columns are available.
 * @param props - Contains label, value, columns, and onChange callback.
 * @returns A select or text field for column selection.
 */
function ColumnSelector(props: ColumnSelectorProps): React.JSX.Element | null {
  const { label, value, columns, required, onChange } = props;

  if (!columns || columns.length === 0) {
    return (
      <TextField
        label={label}
        defaultValue={value}
        onBlur={(e) => onChange(e.target.value)}
        required={required}
        size="small"
        fullWidth={true}
        autoComplete="off"
      />
    );
  }

  return (
    <Select required={required} label={label} value={value} onChange={(newValue) => onChange && onChange(newValue)}>
      <option>Select a value</option>
      {(columns || []).map((col) => (
        <option key={col.name} value={col.name}>
          {col.name}
        </option>
      ))}
    </Select>
  );
}
/**
 * Generates a complete migration script including schema creation and data insertion.
 * Supports multiple target dialects (RDBMS, Cassandra, MongoDB, CosmosDB, Azure Table).
 * @param toDialect - The target database dialect.
 * @param toDatabaseId - The target database name.
 * @param toTableId - The target table/collection name.
 * @param fromQuery - The source query to fetch data from.
 * @param columns - Column metadata for schema generation.
 * @param fromDataToUse - Optional pre-fetched data to use instead of executing the query.
 * @param migrationMetaData - Additional migration configuration (e.g., Azure Table keys).
 * @returns A tuple of [migrationScript, errors] strings.
 */
export async function generateMigrationScript(
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
    case "mysql":
    case "mariadb":
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
      res.push(`-- Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatSQL(getCreateDatabaseForRdbms(toQueryMetaData)?.query || ""));
      res.push(formatSQL(getCreateTableForRdbms(toQueryMetaData)?.query || ""));
      res.push(`USE ${toDatabaseId}`);
      break;
    case "cassandra":
      res.push(`-- Schema Creation Script : ${migrationInfoMessage}`);

      // special type mapping for cassandra
      toQueryMetaData.columns = toQueryMetaData.columns.map((col) => {
        let type = col.type.toLowerCase();
        if (type.includes("int") || type.includes("integer")) {
          type = "INT";
        } else if (type.includes("float")) {
          type = "FLOAT";
        } else if (type === "bit" || type === "boolean") {
          type = "BOOLEAN";
        } else {
          type = "TEXT";
        }

        // update the type with new mappings
        col.type = type;

        return col;
      });

      res.push(formatSQL(getCreateKeyspaceForCassandra(toQueryMetaData)?.query || ""));
      res.push(formatSQL(getCreateTableForCassandra(toQueryMetaData)?.query || ""));
      break;
    case "mongodb":
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatJS(getCreateDatabaseForMongoDB(toQueryMetaData)?.query || ""));
      res.push(formatJS(getCreateCollectionForMongoDB(toQueryMetaData)?.query || ""));
      break;
    // case 'redis': // TODO: to be implemented
    // case 'rediss': // TODO: to be implemented
    case "cosmosdb":
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatJS(getCreateDatabaseForAzCosmosDb(toQueryMetaData)?.query || ""));
      res.push(formatJS(getCreateContainerForAzCosmosDb(toQueryMetaData)?.query || ""));
      break;
    case "aztable":
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(formatJS(getCreateTableForAzTable(toQueryMetaData)?.query || ""));
      break;
    case "sfdc":
      // Salesforce SObjects must be created in the org's Object Manager — they cannot
      // be created via the REST/jsforce API the way RDBMS tables can. Treat the
      // "New Database Name" / "New Table Name" inputs as the target SObject API name
      // and skip DDL generation.
      res.push(`// Schema Creation Script : ${migrationInfoMessage}`);
      res.push(
        `// Salesforce does not support creating SObjects via the API.`,
        `// Ensure the target SObject "${toTableId}" already exists in your org (Setup > Object Manager).`,
      );
      break;
  }

  // getInsert
  // first get the results
  try {
    const results = fromDataToUse || (await dataApi.execute(fromQuery));
    const hasSomeResults = results.raw && results.raw.length > 0;

    // The disable-FK toggle wraps the data step in dialect-specific statements that
    // suspend referential-integrity checks for the duration of the load. Computed once
    // here so each case can splice it in around the INSERT/UPSERT call.
    const fkToggle = migrationMetaData?.disableForeignKeyConstraints ? getForeignKeyToggleForRdbms(toDialect) : undefined;

    // TODO: here we need to perform the query to get the data
    switch (toDialect) {
      case "mysql":
      case "mariadb":
      case "mssql":
      case "postgres":
      case "postgresql":
      case "sqlite":
        res.push(`-- Data Migration Script`);
        if (hasSomeResults) {
          if (fkToggle) {
            res.push(fkToggle.disable);
          }
          // When the user opts in to UPSERT, route through `getBulkUpsert` which emits
          // dialect-appropriate ON CONFLICT / ON DUPLICATE KEY / MERGE syntax. Otherwise
          // fall through to a plain INSERT — the historical default.
          const dataQuery = migrationMetaData?.useUpsert
            ? getBulkUpsertForRdbms(toQueryMetaData, results.raw, migrationMetaData?.upsertKeyField)?.query
            : getBulkInsertForRdbms(toQueryMetaData, results.raw)?.query;
          res.push(formatSQL(dataQuery || ""));
          if (fkToggle) {
            res.push(fkToggle.enable);
          }
        } else {
          res.push(`-- ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case "cassandra":
        res.push(`-- Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatSQL(getBulkInsertForCassandra(toQueryMetaData, results.raw)?.query || ""));
        } else {
          res.push(`-- ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case "mongodb":
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatJS(getBulkInsertForMongoDB(toQueryMetaData, results.raw)?.query || ""));
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      // case 'redis': // TODO: to be implemented
      // case 'rediss': // TODO: to be implemented
      case "cosmosdb":
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(formatJS(getBulkInsertForCosmosDb(toQueryMetaData, results.raw)?.query || ""));
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case "aztable":
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          res.push(
            formatJS(
              getBulkInsertForAzTable(
                toQueryMetaData,
                results.raw,
                migrationMetaData?.azTableRowKeyField,
                migrationMetaData?.azTablePartitionKeyField,
              )?.query || "",
            ),
          );
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
      case "sfdc":
        res.push(`// Data Migration Script`);
        if (hasSomeResults) {
          // Salesforce migration writes to an existing SObject — pass the target SObject
          // API name as tableId so the generated `conn.sobject('<Name>').create([...])`
          // call targets the right object.
          res.push(formatJS(getBulkInsertForSalesforce(toQueryMetaData, results.raw)?.query || ""));
        } else {
          res.push(`// ${MESSAGE_NO_DATA_FOR_MIGRATION}`);
          errors.push(MESSAGE_NO_DATA_FOR_MIGRATION);
        }
        break;
    }
  } catch (err) {
    console.error("MigrationBox:execute", err);
    errors.push(`Select query failed. ${JSON.stringify(err)}`);
  }

  return [res.join("\n\n"), errors.join("\n\n")];
}

/**
 * The main migration form component for generating cross-dialect migration scripts.
 * Supports migrating from a real database connection or from raw JSON data.
 * Generates schema creation and data insertion scripts for the target dialect.
 * @param props - Contains the migration mode.
 * @returns The migration form UI or null.
 */
export default function MigrationBox(props: MigrationBoxProps): React.JSX.Element | null {
  const { mode } = props;
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [migrationMetaData, setMigrationMetaData] = useState<MigrationMetaData>({
    toDialect: "sqlite",
    newDatabaseName: `migrated_database_${Date.now()}`,
    newTableName: `new_table_${Date.now()}`,
  });
  const [query, setQuery] = useState<SqluiFrontend.ConnectionQuery>({
    id: "migration_from_query_" + Date.now(),
    name: "Migration Query",
  });
  const [migrationScript, setMigrationScript] = useState("");
  const [migrating, setMigrating] = useState(false);
  const { data: columns, isLoading: loadingColumns } = useGetColumns(query?.connectionId, query?.databaseId, query?.tableId);
  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(query?.connectionId);
  const { data: connections, isLoading: loadingConnections } = useGetConnections();
  const { onAddQuery } = useConnectionQueries();
  const [rawJson, setRawJson] = useState("");
  const { add: addToast } = useToaster();

  const languageTo = getSyntaxModeByDialect(migrationMetaData?.toDialect);
  const isMigratingRealConnection = mode === "real_connection";
  const isConnectionSelectorVisible = isMigratingRealConnection;
  const isRawJsonEditorVisible = !isMigratingRealConnection;
  const isSaving = migrating;

  const isMigrationScriptVisible = !!migrationScript && !!migrationMetaData.toDialect;
  const isLoading = loadingColumns || loadingConnections || loadingConnection;

  // effects
  useEffect(() => {
    setSearchParams(
      {
        connectionId: query.connectionId || "",
        databaseId: query.databaseId || "",
        tableId: query.tableId || "",
        toDialect: migrationMetaData.toDialect || "sqlite",
      },
      { replace: true },
    );
  }, [query, migrationMetaData]);

  useEffect(() => {
    setQuery({
      ...query,
      connectionId: searchParams.get("connectionId") || "",
      databaseId: searchParams.get("databaseId") || "",
      tableId: searchParams.get("tableId") || "",
    });

    migrationMetaData.toDialect = (searchParams.get("toDialect") as SqluiCore.Dialect) || "sqlite";

    setMigrationScript("");
  }, []);

  useEffect(() => {
    if (query.sql !== migrationMetaData.selectQuery) {
      setQuery({
        ...query,
        sql: migrationMetaData.selectQuery,
      });
    }
  }, [query, migrationMetaData.selectQuery]);

  // events
  const onDatabaseConnectionChange = (connectionId?: string, databaseId?: string, tableId?: string) => {
    setQuery({
      ...query,
      connectionId,
      databaseId,
      tableId,
    });

    setMigrationScript("");
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
              allowNull: !column.primaryKey || column.name === "rowKey" || column.kind === "partition_key",
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

        const columnsToUse = BaseDataAdapter.inferSqlTypeFromItems(parsedRawJson, toDialect).map((col) => {
          return {
            ...col,
            allowNull: true,
          };
        });

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
      setMigrationScript(newMigrationScript || "");

      if (error) {
        await addToast({
          message: error,
        });
      }
    } catch (err) {
      console.error("index.tsx:addToast", err);
    }
    setMigrating(false);
  };

  const onCreateMigrationQueryTab = () => {
    navigate("/");

    onAddQuery({
      name: `Migration Script for Query - ${query.databaseId} - ${query.tableId}`,
      sql: migrationScript,
    });
  };

  const onCancel = () => {
    navigate("/");
  };

  const onRawJsonChange = (newRawJson: string) => {
    setRawJson(newRawJson);
  };

  const onApplySampleQueryForMigration = () => {
    if (query) {
      const fromConnection = connections?.find((connection) => connection.id === query.connectionId);
      const sampleSelectQueryText = getSampleSelectQuery({
        ...fromConnection,
        ...query,
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
      <div className="FormInput__Container">
        <div className="FormInput__Row">
          <Skeleton variant="rectangular" height={25} width={120} />
          <Skeleton variant="rectangular" height={25} width={120} />
          <Skeleton variant="rectangular" height={25} width={120} />
        </div>
        <div className="FormInput__Row">
          <Skeleton variant="rectangular" height={25} width={120} />
          <Skeleton variant="rectangular" height={25} width={120} />
          <Skeleton variant="rectangular" height={25} width={300} />
        </div>
        <div className="FormInput__Row">
          <Skeleton variant="rectangular" height={25} width={200} />
          <Skeleton variant="rectangular" height={25} width={120} />
        </div>
      </div>
    );
  }

  const supportMigration = isDialectSupportMigration(connection?.dialect || "");

  if (!isRawJsonEditorVisible) {
    if (!supportMigration) {
      return (
        <div className="FormInput__Container">
          {isConnectionSelectorVisible && (
            <div className="FormInput__Row">
              <ConnectionDatabaseSelector isTableIdRequired={true} value={query} onChange={onDatabaseConnectionChange} required />
            </div>
          )}
          <Typography className="FormInput__Row" sx={{ color: "error.main" }}>
            Migration Script is not supported for {connection?.dialect}. Please choose a different connection to migrate data from.
          </Typography>
        </div>
      );
    }
  }

  return (
    <form
      className="FormInput__Container"
      onSubmit={(e) => {
        e.preventDefault();
        onGenerateMigration();
      }}
    >
      {isConnectionSelectorVisible && (
        <div className="FormInput__Row">
          <ConnectionDatabaseSelector isTableIdRequired={true} value={query} onChange={onDatabaseConnectionChange} required />
          <Link onClick={onApplySampleQueryForMigration}>Apply Sample Query</Link>
        </div>
      )}
      {isRawJsonEditorVisible && (
        <>
          <Typography sx={{ fontWeight: "medium" }}>Enter Your Raw JSON for migration</Typography>
          <CodeEditorBox
            value={rawJson}
            placeholder={`Enter Your Raw JSON for migration`}
            onChange={onRawJsonChange}
            language="javascript"
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
      <div className="FormInput__Row">
        <LoadingButton variant="contained" type="submit" loading={isSaving} startIcon={<BackupIcon />}>
          Migrate
        </LoadingButton>
        <Button variant="outlined" type="button" disabled={migrating} onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {isMigrationScriptVisible && (
        <>
          <CodeEditorBox value={migrationScript} language={languageTo} disabled={true} />
          <div className="FormInput__Row">
            <Button variant="outlined" type="button" disabled={migrating} onClick={onCreateMigrationQueryTab}>
              Create New Tab with This Migration Query
            </Button>
          </div>
        </>
      )}
    </form>
  );
}

/** Metadata describing the migration target configuration. */
type MigrationMetaData = {
  /** The target database dialect. */
  toDialect?: SqluiCore.Dialect;
  /** Name for the new database to create. */
  newDatabaseName: string;
  /** Name for the new table/collection to create. */
  newTableName: string;
  /** Azure Table Storage row key field (aztable dialect only). */
  azTableRowKeyField?: string;
  /** Azure Table Storage partition key field (aztable dialect only). */
  azTablePartitionKeyField?: string;
  /** SQL query to fetch source data for migration. */
  selectQuery?: string;
  /**
   * When true, the data step generates an UPSERT (`ON CONFLICT` / `ON DUPLICATE KEY` /
   * `MERGE`) instead of an INSERT, so re-running the migration is idempotent.
   */
  useUpsert?: boolean;
  /** Column name used as the upsert key (conflict / match column). Required when useUpsert is true. */
  upsertKeyField?: string;
  /**
   * When true, the generated script wraps the migration in dialect-specific statements
   * that disable foreign-key constraint checks for the duration of the load (e.g.
   * `PRAGMA foreign_keys = OFF` for SQLite, `SET FOREIGN_KEY_CHECKS = 0` for MySQL).
   * Re-enabled at the end of the script.
   */
  disableForeignKeyConstraints?: boolean;
};

/**
 * Whether the given target dialect can take advantage of the "Use UPSERT" toggle.
 * Currently only RDBMS dialects (which need explicit ON CONFLICT / MERGE syntax) —
 * Cassandra inserts are already upserts, and the NoSQL adapters route through their
 * own SDK-level upsert APIs which would need a separate code path.
 *
 * @param dialect - The target dialect identifier.
 * @returns True if the UPSERT toggle is meaningful for the dialect.
 */
function dialectSupportsUpsertToggle(dialect?: SqluiCore.Dialect): boolean {
  switch (dialect) {
    case "mysql":
    case "mariadb":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mssql":
      return true;
    default:
      return false;
  }
}

/**
 * Whether the given target dialect has a session-level toggle for disabling foreign-key
 * constraints. Mirrors {@link getForeignKeyToggleForRdbms} — kept in sync with that switch.
 *
 * @param dialect - The target dialect identifier.
 * @returns True if the disable-FK toggle is meaningful for the dialect.
 */
function dialectSupportsForeignKeyToggle(dialect?: SqluiCore.Dialect): boolean {
  return !!getForeignKeyToggleForRdbms(dialect);
}

/** Props for the MigrationMetaDataInputs component. */
type MigrationMetaDataInputsProps = {
  /** Whether migrating from a real database connection (vs. raw JSON). */
  isMigratingRealConnection: boolean;
  /** The source connection query. */
  query: SqluiFrontend.ConnectionQuery;
  /** Current migration metadata values. */
  value: MigrationMetaData;
  /** Callback when migration metadata changes. */
  onChange: (newValue: MigrationMetaData) => void;
};

/**
 * Form inputs for configuring migration target metadata (dialect, database name, table name).
 * Renders additional fields for dialect-specific options like Azure Table keys.
 * @param props - Contains migration state, query info, and onChange callback.
 * @returns Migration metadata form fields or null while loading.
 */
function MigrationMetaDataInputs(props: MigrationMetaDataInputsProps): React.JSX.Element | null {
  const { query, isMigratingRealConnection, value: migrationMetaData } = props;
  const { data: columns, isLoading: loadingColumns } = useGetColumns(query?.connectionId, query?.databaseId, query?.tableId);
  const { data: connection, isLoading: loadingConnection } = useGetConnectionById(query?.connectionId);
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

  const extraDoms: React.JSX.Element[] = [];

  let shouldShowNewDatabaseIdInput = true;
  switch (migrationMetaData.toDialect) {
    // case 'redis': // TODO: to be implemented
    // case 'rediss': // TODO: to be implemented
    case "mysql":
    case "mariadb":
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "cassandra":
    case "mongodb":
    case "cosmosdb":
    default:
      break;
    case "sfdc":
      // Salesforce orgs have no "database" — only SObjects. Hide the database
      // input and treat "New Table Name" as the target SObject API name.
      shouldShowNewDatabaseIdInput = false;
      break;
    case "aztable":
      shouldShowNewDatabaseIdInput = false;

      extraDoms.push(
        <React.Fragment key="aztable">
          <ColumnSelector
            label="aztable rowKey"
            columns={columns}
            value={migrationMetaData.azTableRowKeyField}
            onChange={(newValue) => onChange("azTableRowKeyField", newValue)}
          />
          <ColumnSelector
            label="aztable partitionKey"
            columns={columns}
            value={migrationMetaData.azTablePartitionKeyField}
            onChange={(newValue) => onChange("azTablePartitionKeyField", newValue)}
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
      <Typography sx={{ color: "error.main" }}>
        Connection information required to generate migration script. Please select one from the above.
      </Typography>
    );
  }

  return (
    <>
      <div className="FormInput__Row">
        <DialectSelector label="Migrate To" value={migrationMetaData.toDialect} onChange={(newValue) => onChange("toDialect", newValue)} />
        {extraDoms}
      </div>

      <div className="FormInput__Row">
        {shouldShowNewDatabaseIdInput && (
          <TextField
            label="New Database Name"
            defaultValue={migrationMetaData.newDatabaseName}
            onBlur={(e) => onChange("newDatabaseName", e.target.value)}
            required
            size="small"
            autoComplete="off"
            sx={{ flexGrow: 1 }}
          />
        )}
        <TextField
          label="New Table Name"
          defaultValue={migrationMetaData.newTableName}
          onBlur={(e) => onChange("newTableName", e.target.value)}
          required
          size="small"
          autoComplete="off"
          sx={{ flexGrow: 1 }}
        />
      </div>

      <MigrationToggleOptions
        columns={columns}
        value={migrationMetaData}
        onChange={onChange}
        supportsUpsert={dialectSupportsUpsertToggle(migrationMetaData.toDialect)}
        supportsForeignKeyToggle={dialectSupportsForeignKeyToggle(migrationMetaData.toDialect)}
      />

      {isQueryRequired && (
        <React.Fragment key="line3">
          <Typography sx={{ fontWeight: "medium" }}>Enter SQL to get Data for migration</Typography>
          <CodeEditorBox
            value={migrationMetaData.selectQuery || ""}
            placeholder={`Enter SQL for ` + query.name}
            onChange={(newValue) => onChange("selectQuery", newValue)}
            language={languageFrom}
          />
        </React.Fragment>
      )}
    </>
  );
}

/** Props for the {@link MigrationToggleOptions} sub-form. */
type MigrationToggleOptionsProps = {
  /** Columns from the source table — used to populate the upsert-key picker. */
  columns?: SqluiCore.ColumnMetaData[];
  /** Current migration metadata. */
  value: MigrationMetaData;
  /** Patched onChange handler bound to a single metadata key. */
  onChange: (propKey: keyof MigrationMetaData, propValue: any) => void;
  /** Whether the target dialect supports the UPSERT toggle. */
  supportsUpsert: boolean;
  /** Whether the target dialect supports the disable-FK toggle. */
  supportsForeignKeyToggle: boolean;
};

/**
 * Optional migration toggles: upsert-instead-of-insert and disable-foreign-key-constraints.
 *
 * Both options are dialect-aware — they only render when the target dialect supports them
 * (see `dialectSupportsUpsertToggle` / `dialectSupportsForeignKeyToggle`). When upsert is
 * enabled, the user must pick the conflict-key column; the picker defaults to the source
 * table's primary key when available.
 *
 * @param props - Form state, change handler, and per-dialect capability flags.
 * @returns The toggle controls, or null when neither toggle is supported.
 */
function MigrationToggleOptions(props: MigrationToggleOptionsProps): React.JSX.Element | null {
  const { columns, value, onChange, supportsUpsert, supportsForeignKeyToggle } = props;

  if (!supportsUpsert && !supportsForeignKeyToggle) {
    return null;
  }

  return (
    <>
      <div className="FormInput__Row" style={{ flexWrap: "wrap" }}>
        {supportsUpsert && (
          <FormControlLabel
            control={<Checkbox size="small" checked={!!value.useUpsert} onChange={(e) => onChange("useUpsert", e.target.checked)} />}
            label="Use UPSERT (idempotent — updates rows that already exist)"
          />
        )}
        {supportsForeignKeyToggle && (
          <FormControlLabel
            control={
              <Checkbox
                size="small"
                checked={!!value.disableForeignKeyConstraints}
                onChange={(e) => onChange("disableForeignKeyConstraints", e.target.checked)}
              />
            }
            label="Disable foreign-key constraints during migration"
          />
        )}
      </div>
      {supportsUpsert && value.useUpsert && (
        <div className="FormInput__Row">
          <ColumnSelector
            label="Upsert Key Column"
            columns={columns}
            value={value.upsertKeyField}
            required
            onChange={(newValue) => onChange("upsertKeyField", newValue)}
          />
        </div>
      )}
    </>
  );
}
