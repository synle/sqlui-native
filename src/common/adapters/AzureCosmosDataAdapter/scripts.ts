import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import cosmosdbIcon from "src/common/adapters/AzureCosmosDataAdapter/cosmosdb.png";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import { SqlAction, SqluiCore } from "typings";

/** Prefix used for the CosmosDB client variable in generated scripts. */
export const COSMOSDB_ADAPTER_PREFIX = "db";

const COSMOSDB_TABLE_ALIAS_PREFIX = "c";

const formatter = "js";

// https://docs.microsoft.com/en-us/azure/cosmos-db/sql/sql-api-nodejs-get-started?tabs=windows
function _shouldIncludeField(col: SqluiCore.ColumnMetaData) {
  if (col.name.indexOf("_") !== 0) {
    return true;
  }

  return false;
}

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

/**
 * Generates a raw SQL SELECT query for all columns in a CosmosDB container.
 * @param input - Table context including database and table identifiers.
 * @returns Script output with raw SQL syntax.
 */
export function getRawSelectAllColumns(_input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Raw Select All Columns SQL`;

  return {
    label,
    formatter: "sql",
    query: `SELECT * FROM c`,
  };
}

/**
 * Generates a JS SDK script to select all columns from a CosmosDB container with pagination.
 * @param input - Table context including database, table, and query size.
 * @returns Script output with JS SDK syntax.
 */
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  const sql = `
  SELECT *
  FROM ${COSMOSDB_TABLE_ALIAS_PREFIX}
  OFFSET 0 LIMIT ${input.querySize}`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items
        .query({
          query: \`${sql}\`,
        })
        .fetchAll()
    `,
  };
}
/**
 * Generates a JS SDK script to select an item by its ID from a CosmosDB container.
 * @param input - Table context including database and table identifiers.
 * @returns Script output with a WHERE clause filtering by ID.
 */
export function getSelectById(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select By Id`;

  const sql = `
  SELECT *
  FROM ${COSMOSDB_TABLE_ALIAS_PREFIX}
  WHERE ${COSMOSDB_TABLE_ALIAS_PREFIX}.id = '123'`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items
        .query({
          query: \`${sql}\`,
        })
        .fetchAll()
    `,
  };
}

/**
 * Generates a JS SDK script to read a single item by ID and partition key.
 * @param input - Table context including database and table identifiers.
 * @returns Script output using the item().read() SDK method.
 */
export function getReadItemById(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Read`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .item('some_id','some_partition_key')
        .read()
    `,
  };
}

/**
 * Generates a JS SDK script to select specific columns with WHERE conditions.
 * @param input - Table context including columns, database, and table identifiers.
 * @returns Script output with column-specific SELECT and WHERE clauses.
 */
export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  const columnString = input?.columns?.map((col) => `${COSMOSDB_TABLE_ALIAS_PREFIX}.${col.name}`).join(",\n  ");
  const whereColumnString = input?.columns?.map((col) => `${COSMOSDB_TABLE_ALIAS_PREFIX}.${col.name} = ''`).join("\n  AND ");

  const sql = `
  SELECT ${columnString}
  FROM ${COSMOSDB_TABLE_ALIAS_PREFIX}
  WHERE ${whereColumnString}
  OFFSET 0 LIMIT ${input.querySize}`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items
        .query({
          query: \`${sql}\`,
        })
        .fetchAll()
    `,
  };
}

/**
 * Generates a JS SDK script to insert a single item into a CosmosDB container.
 * @param input - Table context including columns, database, and table identifiers.
 * @param value - Optional pre-populated values for the new item.
 * @returns Script output using the items.create() SDK method.
 */
export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert`;

  let colMap: any = {};
  if (value) {
    for (const key of Object.keys(value)) {
      colMap[key] = value[key];
    }
  } else {
    colMap = _getColMapForInsertAndUpdate(input?.columns);
  }

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items
        .create(${JSON.stringify(colMap)})
    `,
  };
}

/**
 * Generates a JS SDK script to bulk insert multiple items into a CosmosDB container.
 * @param input - Table context including columns, database, and table identifiers.
 * @param rows - Array of row data to insert.
 * @returns Script output using Promise.all with items.create(), or undefined if no rows.
 */
export function getBulkInsert(input: SqlAction.TableInput, rows?: Record<string, any>[]): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!rows || rows.length === 0) {
    return undefined;
  }

  const rowsToInsert = rows.map((value) => {
    let colMap: any = {};
    if (value) {
      for (const key of Object.keys(value)) {
        colMap[key] = value[key];
      }
    } else {
      colMap = _getColMapForInsertAndUpdate(input?.columns);
    }
    return colMap;
  });

  // TODO: figure out if there's a better / more efficient way to handle bulk insert

  return {
    label,
    formatter,
    query: `
      const containerItems = client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .items;

      Promise.all(${rowsToInsert.map((value) => {
        return "containerItems.create(" + JSON.stringify(value) + ")";
      })})
    `,
  };
}

/**
 * Generates a JS SDK script to update (replace) an item with specific values.
 * @param input - Table context including columns, database, and table identifiers.
 * @param value - New field values to apply.
 * @param conditions - Conditions identifying the item to update.
 * @returns Script output using the item().replace() SDK method.
 */
export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  _conditions: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Update`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);

  if (value) {
    for (const key of Object.keys(value)) {
      colMap[key] = value[key];
    }
  }

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .item('some_id','some_partition_key')
        .replace(${JSON.stringify(colMap)})
    `,
  };
}

/**
 * Generates a JS SDK script to update (replace) an item using a template with placeholder values.
 * @param input - Table context including columns, database, and table identifiers.
 * @returns Script output using the item().replace() SDK method.
 */
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);
  colMap["id"] = "some_id";

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .item('some_id','some_partition_key')
        .replace(${JSON.stringify(colMap)})
    `,
  };
}

/**
 * Generates a JS SDK script to delete an item by ID and partition key.
 * @param input - Table context including database and table identifiers.
 * @returns Script output using the item().delete() SDK method.
 */
export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .item('some_id','some_partition_key')
        .delete()
    `,
  };
}
/**
 * Generates a JS SDK script to create a new container in a CosmosDB database.
 * @param input - Table context including database and table identifiers.
 * @returns Script output using the containers.create() SDK method.
 */
export function getCreateContainer(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Container`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .containers
        .create({id: '${input.tableId}'})
    `,
  };
}

/**
 * Generates a JS SDK script to drop (delete) a container from a CosmosDB database.
 * @param input - Table context including database and table identifiers.
 * @returns Script output using the container().delete() SDK method.
 */
export function getDropContainer(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Container`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .container('${input.tableId}')
        .delete()
    `,
  };
}

/**
 * Generates a JS SDK script to create a new CosmosDB database.
 * @param input - Database context including the database identifier.
 * @returns Script output using the databases.create() SDK method.
 */
export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  return {
    label,
    formatter,
    query: `
      client
        .databases
        .create({id: '${input.databaseId}'})
    `,
  };
}

/**
 * Generates a JS SDK script to create a new container within a CosmosDB database.
 * @param input - Database context including the database identifier.
 * @returns Script output using the containers.create() SDK method.
 */
export function getCreateDatabaseContainer(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database Container`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .containers
        .create({id: 'some_container_name'})
    `,
  };
}

/**
 * Generates a JS SDK script to drop (delete) a CosmosDB database.
 * @param input - Database context including the database identifier.
 * @returns Script output using the database().delete() SDK method.
 */
export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  return {
    label,
    formatter,
    query: `
      client
        .database('${input.databaseId}')
        .delete()
    `,
  };
}
/**
 * Generates a JS SDK script to create a new database at the connection level.
 * @param input - Connection context.
 * @returns Script output using the databases.create() SDK method with a placeholder name.
 */
export function getCreateConnectionDatabase(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  return {
    label,
    formatter,
    query: `
      client
        .databases
        .create({id: 'some_database_name'})
    `,
  };
}

/**
 * Script generator for Azure Cosmos DB, providing query templates, connection form inputs, and code snippets.
 */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["cosmosdb"];

  /** Returns true because Cosmos DB requires a table/container ID to scope queries. */
  getIsTableIdRequiredForQuery() {
    return true;
  }

  /** Returns the Monaco syntax mode identifier for Cosmos DB scripts. */
  getSyntaxMode() {
    return "javascript";
  }

  /**
   * Returns the connection form field definitions for Cosmos DB.
   * @returns Array of [fieldName, label] tuples for the connection form UI.
   */
  getConnectionFormInputs() {
    return [["restOfConnectionString", "Azure CosmosDB Primary Connection String"]];
  }

  /** Returns "ado" because CosmosDB uses ADO.NET-style semicolon-delimited key=value connection strings. */
  getConnectionStringFormat(): "url" | "json" | "ado" {
    return "ado";
  }

  /** Returns true because Cosmos DB supports data migration. */
  supportMigration() {
    return true;
  }

  /** Returns true because Cosmos DB supports the create record form. */
  supportCreateRecordForm() {
    return true;
  }

  /** Returns true because Cosmos DB supports the edit record form. */
  supportEditRecordForm() {
    return true;
  }

  /**
   * Returns the ordered list of table-level script generators for Cosmos DB.
   * @returns Array of script generator functions for container operations.
   */
  getTableScripts() {
    return [
      getSelectAllColumns,
      getSelectSpecificColumns,
      getSelectById,
      getDivider,
      getReadItemById,
      getInsert,
      getUpdate,
      getDelete,
      getDivider,
      getRawSelectAllColumns,
      getDivider,
      getCreateContainer,
      getDropContainer,
    ];
  }

  /**
   * Returns the ordered list of database-level script generators for Cosmos DB.
   * @returns Array of script generator functions for database operations.
   */
  getDatabaseScripts() {
    return [getDivider, getCreateDatabase, getCreateDatabaseContainer, getDivider, getDropDatabase];
  }

  /**
   * Returns the ordered list of connection-level script generators for Cosmos DB.
   * @returns Array of script generator functions for connection operations.
   */
  getConnectionScripts() {
    return [getDivider, getCreateConnectionDatabase];
  }

  /** Returns the Cosmos DB dialect icon asset. */
  getDialectIcon() {
    return cosmosdbIcon;
  }

  /** Returns the display name for the Azure Cosmos DB dialect. */
  getDialectName() {
    return "Azure Cosmos DB";
  }

  /**
   * Returns a sample Cosmos DB connection string for the given dialect.
   * @param dialect - The dialect identifier (e.g., "cosmosdb").
   * @returns A sample connection URL string.
   */
  getSampleConnectionString(dialect) {
    return `${dialect}://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
  }

  /**
   * Returns a sample SELECT * query for the given table input.
   * @param tableActionInput - The table context for which to generate the sample query.
   * @returns Script output with the sample select query.
   */
  getSampleSelectQuery(tableActionInput) {
    return getSelectAllColumns(tableActionInput);
  }

  /**
   * Generates a connection code snippet for the given language.
   * @param connection - The connection metadata including the connection string.
   * @param query - The query context including SQL, database, and table identifiers.
   * @param language - The target language ("javascript", "python", or "java").
   * @returns A rendered code snippet string, or empty string if unsupported.
   */
  getCodeSnippet(connection, query, language) {
    const connectionString = connection.connection.replace("cosmosdb://", "");
    const databaseId = query.databaseId;
    const tableId = query.tableId;

    switch (language) {
      case "javascript":
        return renderCodeSnippet("javascript", "cosmosdb", {
          connectionString,
          sql: query.sql,
        });
      case "python":
        return renderCodeSnippet("python", "cosmosdb", {
          connectionString,
          databaseId,
          tableId,
        });
      case "java":
        return renderCodeSnippet(
          "java",
          "cosmosdb",
          { connectionString, databaseId, tableId },
          {
            connectDescription: "Azure Cosmos DB",
            gradleDep: `    implementation 'com.azure:azure-cosmos:4.53.1'`,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Connects to:
 * Azure Cosmos DB
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
