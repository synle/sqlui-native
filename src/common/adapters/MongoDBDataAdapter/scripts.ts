import set from "lodash.set";
import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import mongodbIcon from "src/common/adapters/MongoDBDataAdapter/mongodb.png";
import { SqlAction, SqluiCore } from "typings";

/** Prefix used for MongoDB query syntax in sqlui-native. */
export const MONGO_ADAPTER_PREFIX = "db";

const formatter = "js";

/**
 * Serializes an object to JSON suitable for MongoDB scripts, converting `_id` values to `ObjectId()`.
 * @param object - The object to serialize.
 * @returns A JSON string with ObjectId references properly formatted.
 */
export function serializeJsonForMongoScript(object: any) {
  let res = JSON.stringify(
    object,
    (k, v) => {
      if (k === "_id") {
        return `ObjectId('${v}')`;
      }
      return v;
    },
    2,
  );

  // here we construct ObjectId
  res = res.replace(/"ObjectId\('[a-z0-9_]*'\)"/, (a) => {
    const id = a.replace(`ObjectId`, "").replace(/[()'"]/g, "");
    return `ObjectId("${id}")`;
  });

  return res;
}

/**
 * Generates a script to select all documents from a collection.
 * @param input - Table input containing the collection name and query size.
 * @returns Script output with the find query.
 */
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find().limit(${input.querySize}).toArray();`,
  };
}

/**
 * Generates a script to select a single document by _id.
 * @param input - Table input containing the collection name.
 * @returns Script output with the findOne query.
 */
export function getSelectOne(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select One Record`;

  const filters = { _id: "some_id" };

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').findOne(${serializeJsonForMongoScript(filters)});`,
  };
}

/**
 * Generates a script to find documents matching specific column values.
 * @param input - Table input containing columns and query size.
 * @returns Script output with the find query, or undefined if no columns.
 */
export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columns: any = {};
  for (const column of input.columns || []) {
    // construct nested object properly
    columns[column.propertyPath ? column.propertyPath.join(".") : column.name] = column.type === "string" ? "_some_value_" : 123;
  }
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find(
          ${serializeJsonForMongoScript(columns)}
        ).limit(${input.querySize}).toArray();`,
  };
}
/**
 * Generates a script to select distinct values for a field in a collection.
 * @param input - Table input containing columns for the distinct query.
 * @returns Script output with the distinct query.
 */
export function getSelectDistinctValues(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Distinct`;
  const columns = input.columns || [];
  const whereColumnString = columns.reduce((res: any, col) => {
    res[col.name] = "";
    return res;
  }, {});

  // select something that is not _id or id
  const distinctColumn = columns.filter((col) => col.name !== "_id" && col.name !== "id")?.[0]?.name || "some_field";

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').distinct(
          '${distinctColumn}',
          ${serializeJsonForMongoScript(whereColumnString)}
        )`,
  };
}

/**
 * Generates an insertMany script for a single document.
 * @param input - Table input containing columns.
 * @param value - Optional pre-populated values to insert.
 * @returns Script output with the insertMany query, or undefined if no columns.
 */
export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  let columns: any = {};

  if (value) {
    columns = value;
  } else {
    for (const column of input.columns) {
      if (column.name !== "_id") {
        const valueToUse: any = column.type === "string" ? "abc" : 123;
        set(columns, column.propertyPath || column.name, valueToUse);
      }
    }
  }

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').insertMany([
        ${serializeJsonForMongoScript(columns)}
      ]);`,
  };
}

/**
 * Generates an insertMany script for multiple documents.
 * @param input - Table input containing columns.
 * @param rows - Array of row objects to insert.
 * @returns Script output with the insertMany query, or undefined if no columns.
 */
export function getBulkInsert(input: SqlAction.TableInput, rows?: Record<string, any>[]): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const rowsToInsert = rows || [];

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').insertMany(
        ${serializeJsonForMongoScript(rowsToInsert)}
      );`,
  };
}

/**
 * Generates an update script with specific values and conditions.
 * @param input - Table input containing the collection name.
 * @param value - Field values to set.
 * @param conditions - Filter conditions for the update.
 * @returns Script output with the update query.
 */
export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  conditions: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Update`;

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
        ${serializeJsonForMongoScript(conditions)},
        {$set: ${serializeJsonForMongoScript(value)}}
      );`,
  };
}

/**
 * Generates an update script template with dummy values derived from columns.
 * @param input - Table input containing columns.
 * @returns Script output with the update query, or undefined if no columns.
 */
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columns: any = {};
  for (const column of input.columns) {
    if (column.name !== "_id") {
      const valueToUse: any = column.type === "string" ? "abc" : 123;
      set(columns, column.propertyPath || column.name, valueToUse);
    }
  }

  const filters = {
    ...columns,
    ...{ _id: "some_id" },
  };

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
        ${serializeJsonForMongoScript(filters)},
        {$set: ${serializeJsonForMongoScript(columns)}}
      );`,
  };
}

/**
 * Generates a deleteMany script template.
 * @param input - Table input containing columns for the delete filter.
 * @returns Script output with the deleteMany query, or undefined if no columns.
 */
export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const columns: any = {};
  for (const column of input.columns) {
    // construct nested object properly
    columns[column.propertyPath ? column.propertyPath.join(".") : column.name] = column.type === "string" ? "_some_value_" : 123;
  }
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').deleteMany(
        ${serializeJsonForMongoScript(columns)}
      );`,
  };
}

/**
 * Generates a createCollection script.
 * @param input - Table input containing the collection name to create.
 * @returns Script output with the createCollection query, or undefined if no columns.
 */
export function getCreateCollection(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Collection`;

  if (!input.columns) {
    return undefined;
  }

  // TODO: figure out how to use the defaultval

  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.createCollection("${input.tableId}")`,
  };
}

/**
 * Generates a drop collection script.
 * @param input - Table input containing the collection name to drop.
 * @returns Script output with the drop query.
 */
export function getDropCollection(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Collection`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').drop()`,
  };
}

/**
 * Generates a create database script.
 * @param input - Database input containing the database name.
 * @returns Script output with the createDatabase query.
 */
export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.createDatabase('${input.databaseId}')`,
  };
}

/**
 * Generates a drop database script.
 * @param input - Database input containing the database name.
 * @returns Script output with the dropDatabase query.
 */
export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.dropDatabase()`,
  };
}

/**
 * Generates a create database script at the connection level with a placeholder name.
 * @param input - Connection input.
 * @returns Script output with the createDatabase query.
 */
export function getCreateConnectionDatabase(input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Create Database`;
  return {
    label,
    formatter,
    query: `${MONGO_ADAPTER_PREFIX}.createDatabase('some_database_name')`,
  };
}

/**
 * Best-effort conversion of JS MongoDB syntax to Python PyMongo syntax.
 * Converts `db.collection('name').find(...)` to `db['name'].find(...)`.
 */
function _convertMongoJsToPython(sql: string): string {
  return sql
    .replace(/db\.collection\('([^']+)'\)/g, "db['$1']")
    .replace(/\.toArray\(\)/g, "")
    .replace(/\.limit\((\d+)\)/g, ".limit($1)");
}

/** Script generator for MongoDB and MongoDB+SRV dialects. */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["mongodb", "mongodb+srv"];

  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return "javascript";
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

  // dialect definitions
  getDialectType(dialect) {
    return `mongodb` as SqluiCore.Dialect;
  }
  getDialectIcon(dialect) {
    return mongodbIcon;
  }

  // core methods
  getTableScripts() {
    return [
      getSelectAllColumns,
      getSelectSpecificColumns,
      getSelectDistinctValues,
      getSelectOne,
      getDivider,
      getInsert,
      getUpdate,
      getDelete,
      getDivider,
      getCreateCollection,
      getDropCollection,
    ];
  }

  getDatabaseScripts() {
    return [getDivider, getCreateDatabase, getDropDatabase];
  }

  getConnectionScripts() {
    return [getDivider, getCreateConnectionDatabase];
  }

  getSampleConnectionString(dialect) {
    return `${dialect}://username:password@localhost:27017`;
  }

  getSampleSelectQuery(tableActionInput) {
    return getSelectAllColumns(tableActionInput);
  }

  getCodeSnippet(connection, query, language) {
    const connectionString = connection.connection;
    const sql = query.sql;
    const database = query.databaseId;

    switch (language) {
      case "javascript":
        return renderCodeSnippet("javascript", "mongodb", {
          connectionString,
          database,
          sql,
        });
      case "python":
        return renderCodeSnippet("python", "mongodb", {
          connectionString,
          database,
          pythonSql: _convertMongoJsToPython(sql),
        });
      case "java":
        return renderCodeSnippet(
          "java",
          "mongodb",
          { connectionString, database },
          {
            connectDescription: connectionString,
            gradleDep: `    implementation 'org.mongodb:mongodb-driver-sync:4.11.1'`,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Connects to:
 * ${connectionString}
 *
 * Run:
 * ./gradlew run
 */`,
          },
        );
      default:
        return ``;
    }
  }
}

export default new ConcreteDataScripts();
