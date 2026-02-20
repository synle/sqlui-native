import BaseDataScript, { buildJavaGradleSnippet, getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { SqlAction, SqluiCore } from "typings";
// https://docs.microsoft.com/en-us/azure/cosmos-db/table/how-to-use-nodejs
// https://docs.microsoft.com/en-us/javascript/api/@azure/data-tables/?view=azure-node-latest

const formatter = "js";

export const AZTABLE_TABLE_CLIENT_PREFIX = "tableClient";

export const AZTABLE_TABLE_SERVICE_PREFIX = "serviceClient";

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

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
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

export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  conditions: Record<string, any>,
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

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_CLIENT_PREFIX}.deleteEntity('some_partition_key', 'some_row_key');
    `,
  };
}

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
export function getCreateDatabaseTable(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  return {
    label,
    formatter,
    query: `
      ${AZTABLE_TABLE_SERVICE_PREFIX}.createTable('somenewtablename')
    `,
  };
}

export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["aztable"];

  getConnectionFormInputs() {
    return [["restOfConnectionString", "Azure Table Storage Connection String"]];
  }

  getIsTableIdRequiredForQuery() {
    return true;
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

  getDatabaseScripts() {
    return [getDivider, getCreateDatabaseTable];
  }

  getConnectionScripts() {
    return [];
  }

  getDialectName(dialect) {
    return "Azure Table Storage";
  }

  getSampleConnectionString(dialect) {
    return `aztable://DefaultEndpointsProtocol=https;AccountName=<your_account_name>;AccountKey=<your_account_key>;EndpointSuffix=core.windows.net`;
  }

  getSampleSelectQuery(tableActionInput) {
    return getSelectAllColumns(tableActionInput);
  }

  getCodeSnippet(connection, query, language) {
    const connectionString = connection.connection.replace("aztable://", "");

    switch (language) {
      case "javascript":
        return `
// npm install --save @azure/data-tables
const { TableClient, TableServiceClient } = require('@azure/data-tables');

async function _doWork(){
  const connectionString = '${connectionString}';
  const table = '${query.tableId}'

  const serviceClient = TableServiceClient.fromConnectionString(connectionString);
  const tableClient = table ? TableClient.fromConnectionString(connectionString, table) : undefined;

  try{
    const res = ${query.sql};
    for await (const item of res) {
      console.log(item);
    }
  } catch(err){
    console.log('Failed to connect', err)
  }
}

_doWork();
        `.trim();
      case "python":
        return `
# python3 -m venv ./ # setting up virtual environment
# source bin/activate # activate the venv profile
# pip install azure-data-tables
from azure.data.tables import TableServiceClient, TableClient

def _do_work():
    try:
        connection_string = '${connectionString}'
        table = '${query.tableId}'

        service_client = TableServiceClient.from_connection_string(connection_string)
        table_client = TableClient.from_connection_string(connection_string, table) if table else None

        # List tables
        # for table in service_client.list_tables():
        #     print(table.name)

        # Query entities
        if table_client:
            entities = table_client.list_entities()
            for entity in entities:
                print(entity)
    except Exception as err:
        print('Failed to connect', err)

_do_work()
        `.trim();
      case "java":
        return buildJavaGradleSnippet({
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
          mainJavaCode: `import com.azure.data.tables.TableClient;
import com.azure.data.tables.TableClientBuilder;
import com.azure.data.tables.TableServiceClient;
import com.azure.data.tables.TableServiceClientBuilder;
import com.azure.data.tables.models.TableEntity;
import com.azure.data.tables.models.ListEntitiesOptions;

public class Main {
    public static void main(String[] args) {
        String connectionString = "${connectionString}";
        String table = "${query.tableId}";

        try {
            TableServiceClient serviceClient = new TableServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();

            TableClient tableClient = new TableClientBuilder()
                .connectionString(connectionString)
                .tableName(table)
                .buildClient();

            // List entities
            for (TableEntity entity : tableClient.listEntities()) {
                System.out.println("PartitionKey: " + entity.getPartitionKey()
                    + ", RowKey: " + entity.getRowKey()
                    + ", Properties: " + entity.getProperties());
            }
        } catch (Exception e) {
            System.out.println("Failed to connect: " + e.getMessage());
        }
    }
}`,
        });
      default:
        return "";
    }
  }
}

export default new ConcreteDataScripts();
