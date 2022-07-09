import { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction, SqluiCore } from 'typings';
import {escapeSQLValue, isValueNumber} from 'src/frontend/utils/formatter';

const formatter = 'sql';

function _isColumnNumberField(col: SqluiCore.ColumnMetaData){
  return col.type.toLowerCase().includes('int');
}

export function getSampleConnectionString(dialect?: SqluiCore.Dialect) {
  return `cassandra://username:password@localhost:9042`;
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

export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => {
    let valToUse = '';
    if(value){
      if (value?.[col.name]) {
        // use the value if it's there
        valToUse = `${escapeSQLValue(value[col.name])}`;
      }
    } else {
      valToUse = _isColumnNumberField(col) ? '123' : `_${col.name}_`;
    }

    if(_isColumnNumberField(col)){
      // don't wrap with quote
      return valToUse;
    }

    return `'${valToUse}'`
  });

  return {
    label,
    formatter,
    query: `INSERT INTO ${input.tableId} (${columnString})
              VALUES (${insertValueString})`,
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

      if(!isValueNumber(valToUse)){
        // wrap the single quote for string
        valToUse = `'${escapeSQLValue(valToUse)}'`
      }

      return `${colName} = ${valToUse}`
    })
    .join(', \n');

  const whereColumnString = Object.keys(conditions)
    .map((colName) => {
      let valToUse = conditions[colName];

      if(!isValueNumber(valToUse)){
        // wrap the single quote for string
        valToUse = `'${escapeSQLValue(valToUse)}'`
      }

      return `${colName} = ${valToUse}`
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

  const columnString = input.columns.map((col) => `${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  return {
    label,
    formatter: 'js',
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
    query: `CREATE KEYSPACE IF NOT EXISTS some_keyspace
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
export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
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

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getDivider,
  getCreateKeyspace, // TODO: right now this command does not tie to the input, it will hard code the keyspace to be some_keyspace
  getDropKeyspace,
];

export const connectionActionScripts: SqlAction.ConnectionActionScriptGenerator[] = [
  getDivider,
  getCreateConnectionDatabase,
];
