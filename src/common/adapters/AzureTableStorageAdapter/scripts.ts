import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import aztableIcon from "src/common/adapters/AzureTableStorageAdapter/aztable.png";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import { SqlAction, SqluiCore } from "typings";
// https://docs.microsoft.com/en-us/azure/cosmos-db/table/how-to-use-nodejs
// https://docs.microsoft.com/en-us/javascript/api/@azure/data-tables/?view=azure-node-latest

const formatter = "js";

/** Prefix for the TableClient variable in generated Azure Table Storage scripts. */
export const AZTABLE_TABLE_CLIENT_PREFIX = "tableClient";

/** Prefix for the TableServiceClient variable in generated Azure Table Storage scripts. */
export const AZTABLE_TABLE_SERVICE_PREFIX = "serviceClient";

/** Column names to exclude from insert and update operations (system-managed fields). */
export const AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE = "etag,timestamp".split(",");

function _getColMapForInsertAndUpdate(columns?: SqluiCore.ColumnMetaData[]) {
  return (
    columns?.reduce((res, col) => {
      if (_shouldIncludeField(col)) {
        switch (col.type) {
          case "string":
            res[col.name] = "";
            break;
          case "number":
            res[col.name] = 123;
            break;
          case "array":
            res[col.name] = [];
            break;
        }
      }

      return res;
    }, {}) || {}
  );
}

function _shouldIncludeField(col: SqluiCore.ColumnMetaData) {
  if (col.name === "timestamp" || col.name === "etag") {
    return false;
  }
  return true;
}

/**
 * Generates a script to list all entities from an Azure Table.
 * @param input - Table context including table identifier.
 * @returns Script output using the tableClient.listEntities() method.
 */
export function getSelectAllColumns(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_CLIENT_PREFIX}.listEntities({
        queryOptions: { filter: \`\` }
      })
    `,
  };
}

/**
 * Generates a script to list entities with specific columns and a partition key filter.
 * @param input - Table context including columns and table identifier.
 * @returns Script output with column selection and filter options.
 */
export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  const columns = input?.columns?.map((col) => col.name);

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_CLIENT_PREFIX}.listEntities({
        queryOptions: {
          filter: \`PartitionKey eq 'some_partition_key'\`,
          select: ${JSON.stringify(columns)}
        }
      })
    `,
  };
}

/**
 * Generates a script to insert (create) a single entity in an Azure Table.
 * @param input - Table context including columns.
 * @param value - Optional pre-populated values for the new entity.
 * @returns Script output using the tableClient.createEntity() method.
 */
export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);
  colMap["rowKey"] = "some_row_key";
  colMap["partitionKey"] = "some_partition_key";

  if (value) {
    for (const key of Object.keys(value)) {
      colMap[key] = value[key];
    }
  }

  return {
    label,
    formatter,
    query: `${AZTABLE_TABLE_CLIENT_PREFIX}.createEntity(${JSON.stringify(colMap)})`,
  };
}

/**
 * Generates a script to bulk insert multiple entities into an Azure Table.
 * @param input - Table context including columns for key inference.
 * @param rows - Array of row data to insert.
 * @param rowKeyField - Optional field name to use as the row key.
 * @param partitionKeyField - Optional field name to use as the partition key.
 * @returns Script output using Promise.all with createEntity(), or undefined if no rows.
 */
export function getBulkInsert(
  input: SqlAction.TableInput,
  rows?: Record<string, any>[],
  rowKeyField?: string,
  partitionKeyField?: string,
): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  if (!rows || rows.length === 0) {
    return undefined;
  }

  // TODO: will create the UI for users to hook up row key and partition key
  // find out the primary key
  if (!rowKeyField) {
    for (const column of input.columns) {
      if (column.primaryKey || column.kind === "partition_key") {
        // here is where we infer the rowKey for our record
        rowKeyField = column.name;
        break;
      }
    }
  }

  partitionKeyField = partitionKeyField || rowKeyField;

  rows = rows.map((row) => ({
    ...row,
    rowKey: rowKeyField ? row[rowKeyField]?.toString() : "<your_row_key>",
    partitionKey: partitionKeyField ? row[partitionKeyField]?.toString() : "<your_partition_key>",
  }));

  return {
    label,
    formatter,
    query: `
      Promise.all([
        ${rows.map((row) => `${AZTABLE_TABLE_CLIENT_PREFIX}.createEntity(${JSON.stringify(row)})`).join(",")}
      ])
    `.trim(),
  };
}

/**
 * Generates a script to update an entity with specific values in an Azure Table.
 * @param input - Table context including columns.
 * @param value - New field values to apply.
 * @param conditions - Conditions identifying the entity to update.
 * @returns Script output using the tableClient.updateEntity() method.
 */
export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  _conditions: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Update`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);
  colMap["rowKey"] = "some_row_key";
  colMap["partitionKey"] = "some_partition_key";

  if (value) {
    for (const key of Object.keys(value)) {
      colMap[key] = value[key];
    }

    // for these, let's delete the system key
    for (const keyToDelete of AZTABLE_KEYS_TO_IGNORE_FOR_INSERT_AND_UPDATE) {
      delete colMap[keyToDelete];
    }
  }

  return {
    label,
    formatter,
    query: `${AZTABLE_TABLE_CLIENT_PREFIX}.updateEntity(${JSON.stringify(colMap)})`,
  };
}

/**
 * Generates a script to update an entity using a template with placeholder values.
 * @param input - Table context including columns.
 * @returns Script output using the tableClient.updateEntity() method.
 */
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);
  colMap["rowKey"] = "some_row_key";
  colMap["partitionKey"] = "some_partition_key";

  return {
    label,
    formatter,
    query: `${AZTABLE_TABLE_CLIENT_PREFIX}.updateEntity(${JSON.stringify(colMap)})`,
  };
}

/**
 * Generates a script to upsert (insert or replace) an entity in an Azure Table.
 * @param input - Table context including columns.
 * @returns Script output using the tableClient.upsertEntity() method.
 */
export function getUpsert(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Upsert`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);
  colMap["rowKey"] = "some_row_key";
  colMap["partitionKey"] = "some_partition_key";

  return {
    label,
    formatter,
    query: `${AZTABLE_TABLE_CLIENT_PREFIX}.upsertEntity(${JSON.stringify(colMap)}, 'Replace')`,
  };
}

/**
 * Generates a script to delete an entity by partition key and row key.
 * @param input - Table context.
 * @returns Script output using the tableClient.deleteEntity() method.
 */
export function getDelete(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_CLIENT_PREFIX}.deleteEntity('some_partition_key', 'some_row_key');
    `,
  };
}

/**
 * Generates a script to drop (delete) a table from Azure Table Storage.
 * @param input - Table context including the table identifier.
 * @returns Script output using the serviceClient.deleteTable() method.
 */
export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_SERVICE_PREFIX}.deleteTable('${input.tableId}')
    `,
  };
}

/**
 * Generates a script to create a new table in Azure Table Storage.
 * @param input - Table context including the table identifier.
 * @returns Script output using the serviceClient.createTable() method.
 */
export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_SERVICE_PREFIX}.createTable('${input.tableId}')
    `,
  };
}
/**
 * Generates a script to create a new table at the database level in Azure Table Storage.
 * @param input - Database context.
 * @returns Script output using the serviceClient.createTable() method with a placeholder name.
 */
export function getCreateDatabaseTable(_input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_SERVICE_PREFIX}.createTable('somenewtablename')
    `,
  };
}

/**
 * Script generator for Azure Table Storage, providing query templates, connection form inputs, and code snippets.
 */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["aztable"];

  /**
   * Returns the connection form field definitions for Azure Table Storage.
   * @returns Array of [fieldName, label] tuples for the connection form UI.
   */
  getConnectionFormInputs() {
    return [["restOfConnectionString", "Azure Table Storage Connection String"]];
  }

  /** Returns "ado" because Azure Table Storage uses ADO.NET-style semicolon-delimited key=value connection strings. */
  getConnectionStringFormat(): "url" | "json" | "ado" {
    return "ado";
  }

  /** Returns true because Azure Table Storage requires a table ID to scope queries. */
  getIsTableIdRequiredForQuery() {
    return true;
  }

  /** Returns the Monaco syntax mode identifier for Azure Table Storage scripts. */
  getSyntaxMode() {
    return "javascript";
  }

  /** Returns true because Azure Table Storage supports data migration. */
  supportMigration() {
    return true;
  }

  /** Returns true because Azure Table Storage supports the create record form. */
  supportCreateRecordForm() {
    return true;
  }

  /** Returns true because Azure Table Storage supports the edit record form. */
  supportEditRecordForm() {
    return true;
  }

  /**
   * Returns the ordered list of table-level script generators for Azure Table Storage.
   * @returns Array of script generator functions for table entity operations.
   */
  getTableScripts() {
    return [
      getSelectAllColumns,
      getSelectSpecificColumns,
      getDivider,
      getInsert,
      getUpdate,
      getUpsert,
      getDelete,
      getDivider,
      getCreateTable,
      getDropTable,
    ];
  }

  /**
   * Returns the ordered list of database-level script generators for Azure Table Storage.
   * @returns Array of script generator functions for table creation at the database level.
   */
  getDatabaseScripts() {
    return [getDivider, getCreateDatabaseTable];
  }

  /** Returns an empty array because Azure Table Storage has no connection-level script operations. */
  getConnectionScripts() {
    return [];
  }

  /** Returns the Azure Table Storage dialect icon asset. */
  getDialectIcon() {
    return aztableIcon;
  }

  /** Returns the display name for the Azure Table Storage dialect. */
  getDialectName() {
    return "Azure Table Storage";
  }

  /** Returns a sample Azure Table Storage connection string. */
  getSampleConnectionString() {
    return `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
  }

  /** Returns Azure Table Storage-specific setup guide HTML for the connection form. */
  getConnectionSetupGuide(): string {
    return `
      <strong>Azure Table Storage Setup</strong>
      <ol>
        <li><strong>Connection String</strong> -- Go to <strong>Azure Portal &gt; Storage Account &gt; Access keys</strong> and copy the full connection string.</li>
        <li><strong>Format</strong> -- Prefix with <code>aztable://</code> followed by the connection string: <code>aztable://DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net</code></li>
      </ol>
    `;
  }

  /**
   * Returns a sample listEntities query for the given table input.
   * @param tableActionInput - The table context for which to generate the sample query.
   * @returns Script output with the sample select query.
   */
  getSampleSelectQuery(tableActionInput) {
    return getSelectAllColumns(tableActionInput);
  }

  /**
   * Generates a connection code snippet for the given language.
   * @param connection - The connection metadata including the connection string.
   * @param query - The query context including table identifier and SQL expression.
   * @param language - The target language ("javascript", "python", or "java").
   * @returns A rendered code snippet string, or empty string if unsupported.
   */
  getCodeSnippet(connection, query, language) {
    const connectionString = connection.connection.replace("aztable://", "");
    const tableId = query.tableId;

    switch (language) {
      case "javascript":
        return renderCodeSnippet("javascript", "aztable", {
          connectionString,
          tableId,
          sql: query.sql,
        });
      case "python":
        return renderCodeSnippet("python", "aztable", {
          connectionString,
          tableId,
        });
      case "java":
        return renderCodeSnippet(
          "java",
          "aztable",
          { connectionString, tableId },
          {
            connectDescription: "Azure Table Storage",
            gradleDep: `    implementation 'com.azure:azure-data-tables:12.3.19'`,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Connects to:
 * Azure Table Storage
 *
 * Run:
 * ./gradlew run
 */`,
          },
        );
      default:
        return "";
    }
  }
}

export default new ConcreteDataScripts();
