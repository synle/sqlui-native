import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import cassandraIcon from "src/common/adapters/CassandraDataAdapter/cassandra.png";
import { getClientOptions } from "src/common/adapters/CassandraDataAdapter/utils";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import { escapeSQLValue, isValueBoolean, isValueNumber } from "src/frontend/utils/formatter";
import { SqlAction, SqluiCore } from "typings";

const formatter = "sql";

function _isColumnNumberField(col: SqluiCore.ColumnMetaData) {
  return col.type.toLowerCase().includes("int") || col.type.toLowerCase().includes("float");
}

function _isColumnBooleanField(col: SqluiCore.ColumnMetaData) {
  return col.type.toLowerCase().includes("boolean");
}

function _getDummyColumnValue(col: SqluiCore.ColumnMetaData) {
  if (_isColumnBooleanField(col)) {
    return "true";
  } else if (_isColumnNumberField(col)) {
    return "123";
  } else {
    // other types need to be wrapped in single quote
    return `'_${col.name}_'`;
  }
}

/**
 * Generates a CQL SELECT * query for a table.
 * @param input - Table input containing the table name and query size.
 * @returns Script output with the select query.
 */
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `SELECT *
              FROM ${input.tableId}
              LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a CQL SELECT query for specific columns with a WHERE clause template.
 * @param input - Table input containing columns and query size.
 * @returns Script output with the select query, or undefined if no columns.
 */
export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(",\n");
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join("\n AND ");

  return {
    label,
    formatter,
    query: `SELECT ${columnString}
              FROM ${input.tableId}
              WHERE ${whereColumnString}
              LIMIT ${input.querySize}`,
  };
}

/**
 * Generates a CQL INSERT statement.
 * @param input - Table input containing columns.
 * @param value - Optional pre-populated values to insert.
 * @returns Script output with the insert query, or undefined if no columns.
 */
export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(",\n");
  const insertValueString = input.columns.map((col) => {
    let valToUse: string | null = "";

    if (value) {
      if (value?.[col.name] === null) {
        valToUse = null;
      } else if (value?.[col.name] !== undefined) {
        // use the value if it's there
        valToUse = `${escapeSQLValue(value[col.name])}`;
      }

      if (valToUse === undefined) {
        valToUse = null;
      }

      if (valToUse === null || valToUse === "null") {
        return "null";
      }

      if (_isColumnBooleanField(col)) {
        valToUse = (valToUse || "").toLowerCase();
        if (valToUse === "true" || valToUse === "1") {
          return "true";
        }

        if (valToUse === "false" || valToUse === "0") {
          return "false";
        }

        return "null"; // no value, then returned as null
      }

      if (_isColumnNumberField(col)) {
        // don't wrap with quote
        return valToUse;
      }

      return `'${valToUse}'`;
    } else {
      // no value, generate dummy data
      return _getDummyColumnValue(col);
    }
  });

  return {
    label,
    formatter,
    query: `INSERT INTO ${input.tableId} (${columnString})
              VALUES (${insertValueString})`,
  };
}

/**
 * Generates a CQL BATCH INSERT for multiple rows.
 * @param input - Table input containing columns.
 * @param rows - Array of row objects to insert.
 * @returns Script output with a BATCH statement, or undefined if no columns or rows.
 */
export function getBulkInsert(input: SqlAction.TableInput, rows?: Record<string, any>[]): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  if (!rows || rows.length === 0) {
    return undefined;
  }

  const rowsToInsert = (rows || []).map((value) => getInsert(input, value)).map((output) => output?.query);

  return {
    label,
    formatter,
    query: `
    BEGIN BATCH
    ${rowsToInsert.join(";\n")}
    APPLY BATCH
    `,
  };
}

/**
 * Generates a CQL UPDATE statement with specific values and WHERE conditions.
 * @param input - Table input containing columns.
 * @param value - Field values to set.
 * @param conditions - WHERE clause conditions.
 * @returns Script output with the update query, or undefined if no columns.
 */
export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  conditions: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = Object.keys(value)
    .map((colName) => {
      let valToUse = value[colName];

      if (!isValueNumber(valToUse) && !isValueBoolean(valToUse)) {
        // wrap the single quote for string
        valToUse = `'${escapeSQLValue(valToUse)}'`;
      }

      return `${colName} = ${valToUse}`;
    })
    .join(", \n");

  const whereColumnString = Object.keys(conditions)
    .map((colName) => {
      let valToUse = conditions[colName];

      if (!isValueNumber(valToUse)) {
        // wrap the single quote for string
        valToUse = `'${escapeSQLValue(valToUse)}'`;
      }

      return `${colName} = ${valToUse}`;
    })
    .join(" AND \n");

  return {
    label,
    formatter,
    query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
  };
}

/**
 * Generates a CQL UPDATE template with dummy values derived from columns.
 * @param input - Table input containing columns.
 * @returns Script output with the update query, or undefined if no columns.
 */
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => `${col.name} = ${_getDummyColumnValue(col)}`).join(",\n");
  const whereColumnString = input.columns.map((col) => `${col.name} = ${_getDummyColumnValue(col)}`).join(" AND \n");

  return {
    label,
    formatter,
    query: `UPDATE ${input.tableId}
              SET ${columnString}
              WHERE ${whereColumnString}`,
  };
}

/**
 * Generates a CQL DELETE statement template.
 * @param input - Table input containing columns for the WHERE clause.
 * @returns Script output with the delete query, or undefined if no columns.
 */
export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(" AND \n");

  return {
    label,
    formatter,
    query: `DELETE FROM ${input.tableId}
              WHERE ${whereColumnString}`,
  };
}

/**
 * Generates a CQL CREATE KEYSPACE statement with SimpleStrategy replication.
 * @param input - Database input containing the keyspace name.
 * @returns Script output with the create keyspace query.
 */
export function getCreateKeyspace(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Keyspace`;

  return {
    label,
    formatter,
    query: `CREATE KEYSPACE IF NOT EXISTS ${input.databaseId || "some_keyspace"}
             WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};`,
  };
}

/**
 * Generates a CQL DROP KEYSPACE statement.
 * @param input - Database input containing the keyspace name.
 * @returns Script output with the drop keyspace query.
 */
export function getDropKeyspace(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Keyspace`;

  return {
    label,
    formatter,
    query: `DROP KEYSPACE IF EXISTS ${input.databaseId};`,
  };
}

/**
 * Generates a CREATE KEYSPACE script at the connection level with a placeholder name.
 * @param input - Connection input.
 * @returns Script output with the create keyspace query.
 */
export function getCreateConnectionDatabase(_input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Create Connection Keyspace`;

  return {
    label,
    formatter,
    query: `CREATE KEYSPACE IF NOT EXISTS some_keyspace
           WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};`,
  };
}

/**
 * Generates a CQL CREATE TABLE statement with partition and clustering keys.
 * @param input - Table input containing columns with type and key information.
 * @returns Script output with the create table query, or undefined if no columns.
 */
export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

  let columnString: string = "";
  // mapping column
  columnString = input.columns.map((col) => [col.name, col.type, col.primaryKey ? "PRIMARY KEY" : ""].join(" ")).join(",\n");

  // figuring out the keys
  const partitionKeys: string[] = [],
    clusteringKeys: string[] = [];
  for (const col of input.columns) {
    if (col.kind === "partition_key") {
      partitionKeys.push(col.name);
    } else if (col.kind === "clustering") {
      clusteringKeys.push(col.name);
    }
  }
  if (partitionKeys.length > 0) {
    if (clusteringKeys.length > 0) {
      columnString += `, PRIMARY KEY((${partitionKeys.join(", ")}), ${clusteringKeys.join(", ")})`;
    } else {
      // has only the partition key
      columnString += `, PRIMARY KEY((${partitionKeys.join(", ")}))`;
    }
  }

  return {
    label,
    formatter,
    query: `CREATE TABLE ${input.tableId} (${columnString})`,
  };
}

/**
 * Generates a CQL DROP TABLE statement.
 * @param input - Table input containing the table name.
 * @returns Script output with the drop table query.
 */
export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  return {
    label,
    formatter,
    query: `DROP TABLE ${input.tableId}`,
  };
}

/**
 * Generates a CQL ALTER TABLE ADD column statement.
 * @param input - Table input containing the table name.
 * @returns Script output with the alter table query.
 */
export function getAddColumn(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Add Column`;

  return {
    label,
    formatter,
    query: `ALTER TABLE ${input.tableId}
            ADD new_column1 TEXT`,
  };
}

/**
 * Generates CQL ALTER TABLE DROP statements for each column.
 * @param input - Table input containing the columns to drop.
 * @returns Script output with the alter table drop queries.
 */
export function getDropColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Column`;

  return {
    label,
    formatter,
    query: input.columns
      ?.map(
        (col) => `ALTER TABLE ${input.tableId}
                     DROP ${col.name};`,
      )
      .join("\n"),
  };
}

/** Script generator for the Cassandra dialect. */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["cassandra"];

  getDialectIcon() {
    return cassandraIcon;
  }

  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return "sql";
  }

  supportMigration() {
    return true;
  }

  supportCreateRecordForm() {
    return true;
  }

  supportEditRecordForm() {
    return true;
  }

  getTableScripts() {
    return [
      getSelectAllColumns,
      getSelectSpecificColumns,
      getInsert,
      getDivider,
      getUpdate,
      getDelete,
      getDivider,
      getCreateTable,
      getDropTable,
      getAddColumn,
      getDropColumns,
    ];
  }

  getDatabaseScripts() {
    return [
      getDivider,
      getCreateKeyspace, // TODO: right now this command does not tie to the input, it will hard code the keyspace to be some_keyspace
      getDropKeyspace,
    ];
  }

  getConnectionScripts() {
    return [getDivider, getCreateConnectionDatabase];
  }

  getSampleConnectionString() {
    return `cassandra://username:password@localhost:9042`;
  }

  getSampleSelectQuery(tableActionInput) {
    return getSelectAllColumns(tableActionInput);
  }

  getCodeSnippet(connection, query, language) {
    const sql = query.sql;
    const database = query.databaseId;
    const clientOptions = getClientOptions(connection.connection, database);

    const host = clientOptions.host;
    const port = clientOptions.port;
    const username = clientOptions?.authProvider?.username || "";
    const password = clientOptions?.authProvider?.password || "";
    const keyspace = database || "some_keyspace";

    switch (language) {
      case "javascript":
        return renderCodeSnippet("javascript", "cassandra", {
          clientOptionsJson: JSON.stringify(clientOptions),
          sql,
        });

      case "python":
        return renderCodeSnippet("python", "cassandra", {
          host,
          port,
          username,
          password,
          keyspace,
          sql,
        });

      case "java": {
        const escapedSql = sql.replace(/"/g, '\\"').replace(/\n/g, "\\n");
        const authCredentialsLine = clientOptions.authProvider
          ? `.withAuthCredentials("${username}", "${password}")`
          : `// .withAuthCredentials("username", "password")`;

        return renderCodeSnippet(
          "java",
          "cassandra",
          { host, port, keyspace, escapedSql, authCredentialsLine },
          {
            connectDescription: `Cassandra at ${host}:${port}`,
            gradleDep: `    implementation 'com.datastax.oss:java-driver-core:4.17.0'`,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Connects to:
 * Cassandra at ${host}:${port}
 *
 * Run:
 * ./gradlew run
 */`,
          },
        );
      }
      default:
        return ``;
    }
  }
}

export default new ConcreteDataScripts();
