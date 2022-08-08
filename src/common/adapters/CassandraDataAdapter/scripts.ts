import BaseDataScript, { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { getClientOptions } from 'src/common/adapters/CassandraDataAdapter/utils';
import { escapeSQLValue, isValueBoolean, isValueNumber } from 'src/frontend/utils/formatter';
import { SqlAction, SqluiCore } from 'typings';

const formatter = 'sql';

function _isColumnNumberField(col: SqluiCore.ColumnMetaData) {
  return col.type.toLowerCase().includes('int') || col.type.toLowerCase().includes('float');
}

function _isColumnBooleanField(col: SqluiCore.ColumnMetaData) {
  return col.type.toLowerCase().includes('boolean');
}

function _getDummyColumnValue(col: SqluiCore.ColumnMetaData) {
  if (_isColumnBooleanField(col)) {
    return 'true';
  } else if (_isColumnNumberField(col)) {
    return '123';
  } else {
    // other types need to be wrapped in single quote
    return `'_${col.name}_'`;
  }
}

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

export function getSelectSpecificColumns(
  input: SqlAction.TableInput,
): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n AND ');

  return {
    label,
    formatter,
    query: `SELECT ${columnString}
              FROM ${input.tableId}
              WHERE ${whereColumnString}
              LIMIT ${input.querySize}`,
  };
}

export function getInsert(
  input: SqlAction.TableInput,
  value?: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => {
    let valToUse: string | null = '';

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

      if (valToUse === null || valToUse === 'null') {
        return 'null';
      }

      if (_isColumnBooleanField(col)) {
        valToUse = (valToUse || '').toLowerCase();
        if (valToUse === 'true' || valToUse === '1') {
          return 'true';
        }

        if (valToUse === 'false' || valToUse === '0') {
          return 'false';
        }

        return 'null'; // no value, then returned as null
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

export function getBulkInsert(
  input: SqlAction.TableInput,
  rows?: Record<string, any>[],
): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  if (!rows || rows.length === 0) {
    return undefined;
  }

  const rowsToInsert = (rows || [])
    .map((value) => getInsert(input, value))
    .map((output) => output?.query);

  return {
    label,
    formatter,
    query: `
    BEGIN BATCH
    ${rowsToInsert.join(';\n')}
    APPLY BATCH
    `,
  };
}

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
    .join(', \n');

  const whereColumnString = Object.keys(conditions)
    .map((colName) => {
      let valToUse = conditions[colName];

      if (!isValueNumber(valToUse)) {
        // wrap the single quote for string
        valToUse = `'${escapeSQLValue(valToUse)}'`;
      }

      return `${colName} = ${valToUse}`;
    })
    .join(' AND \n');

  return {
    label,
    formatter,
    query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
  };
}

export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns
    .map((col) => `${col.name} = ${_getDummyColumnValue(col)}`)
    .join(',\n');
  const whereColumnString = input.columns
    .map((col) => `${col.name} = ${_getDummyColumnValue(col)}`)
    .join(' AND \n');

  return {
    label,
    formatter,
    query: `UPDATE ${input.tableId}
              SET ${columnString}
              WHERE ${whereColumnString}`,
  };
}

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  return {
    label,
    formatter,
    query: `DELETE FROM ${input.tableId}
              WHERE ${whereColumnString}`,
  };
}

export function getCreateKeyspace(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Keyspace`;

  return {
    label,
    formatter,
    query: `CREATE KEYSPACE IF NOT EXISTS ${input.databaseId || 'some_keyspace'}
             WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};`,
  };
}

export function getDropKeyspace(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Keyspace`;

  return {
    label,
    formatter,
    query: `DROP KEYSPACE IF EXISTS ${input.databaseId};`,
  };
}

export function getCreateConnectionDatabase(
  input: SqlAction.ConnectionInput,
): SqlAction.Output | undefined {
  const label = `Create Connection Keyspace`;

  return {
    label,
    formatter,
    query: `CREATE KEYSPACE IF NOT EXISTS some_keyspace
           WITH replication = {'class': 'SimpleStrategy', 'replication_factor' : 3};`,
  };
}

export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

  let columnString: string = '';
  // mapping column
  columnString = input.columns
    .map((col) => [col.name, col.type, col.primaryKey ? 'PRIMARY KEY' : ''].join(' '))
    .join(',\n');

  // figuring out the keys
  let partitionKeys: string[] = [],
    clusteringKeys: string[] = [];
  for (const col of input.columns) {
    if (col.kind === 'partition_key') {
      partitionKeys.push(col.name);
    } else if (col.kind === 'clustering') {
      clusteringKeys.push(col.name);
    }
  }
  if (partitionKeys.length > 0) {
    if (clusteringKeys.length > 0) {
      columnString += `, PRIMARY KEY((${partitionKeys.join(', ')}), ${clusteringKeys.join(', ')})`;
    } else {
      // has only the partition key
      columnString += `, PRIMARY KEY((${partitionKeys.join(', ')}))`;
    }
  }

  return {
    label,
    formatter,
    query: `CREATE TABLE ${input.tableId} (${columnString})`,
  };
}

export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  return {
    label,
    formatter,
    query: `DROP TABLE ${input.tableId}`,
  };
}

export function getAddColumn(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Add Column`;

  return {
    label,
    formatter,
    query: `ALTER TABLE ${input.tableId}
            ADD new_column1 TEXT`,
  };
}

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
      .join('\n'),
  };
}

export class ConcreteDataScripts extends BaseDataScript {
  dialects = ['cassandra'];

  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return 'sql';
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

  getSampleConnectionString(dialect) {
    return `cassandra://username:password@localhost:9042`;
  }

  getSampleSelectQuery(actionInput: SqlAction.TableInput) {
    return getSelectAllColumns(actionInput);
  }

  getCodeSnippet(
    connection: SqluiCore.ConnectionProps,
    query: SqluiCore.ConnectionQuery,
    language: SqluiCore.LanguageMode,
  ) {
    const sql = query.sql;
    const database = query.databaseId;
    const clientOptions = getClientOptions(connection.connection, database);

    switch (language) {
      case 'javascript':
        return `
// npm install --save cassandra-driver
const cassandra = require('cassandra-driver')

async function _doWork(){
  try {
    const clientOptions = ${JSON.stringify(clientOptions)};
    const client = new cassandra.Client({
      contactPoints: clientOptions.contactPoints,
      keyspace: clientOptions.keyspace,
      authProvider: clientOptions.authProvider ? new cassandra.auth.PlainTextAuthProvider(
        clientOptions.authProvider.username,
        clientOptions.authProvider.password,
      ): undefined,
      sslOptions: {
        rejectUnauthorized: false, // optional, check to see if you need to disable this SSL check
      }
    });
    await new Promise((resolve, reject) => {
      client.connect((err) => err ? reject(err): resolve());
    })

    const res = await client.execute(\`${sql}\`);
    console.log(res);
  } catch(err){
    console.log('Failed to connect', err);
  }
}

_doWork();
        `.trim();

      case 'python':
        return `
# python3 -m venv ./ # setting up virtual environment with
# source bin/activate # activate the venv profile
# pip install cassandra-driver
from cassandra.cluster import Cluster
from ssl import PROTOCOL_TLSv1_2, SSLContext, CERT_NONE
from cassandra.auth import PlainTextAuthProvider

# remove \`ssl_context=ssl_context\` to disable SSL (applicable for Cassandra in CosmosDB)
ssl_context = SSLContext(PROTOCOL_TLSv1_2)
ssl_context.verify_mode = CERT_NONE
cluster = Cluster(['${clientOptions.host}'], port=${
          clientOptions.port
        }, auth_provider=PlainTextAuthProvider(username='${
          clientOptions?.authProvider?.username || ''
        }', password='${clientOptions?.authProvider?.password || ''}'), ssl_context=ssl_context)
session = cluster.connect()

session.execute('USE ${database || 'some_keyspace'}')
rows = session.execute("""${sql}""")
for row in rows:
    print(row)

        `.trim();

      default:
        return ``;
    }
  }
}

export default new ConcreteDataScripts();
