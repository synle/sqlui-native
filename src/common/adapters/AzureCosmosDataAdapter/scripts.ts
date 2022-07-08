import { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { SqlAction, SqluiCore } from 'typings';

export const COSMOSDB_ADAPTER_PREFIX = 'db';

const COSMOSDB_TABLE_ALIAS_PREFIX = 'c';

const formatter = 'js';

export function getSampleConnectionString(dialect?: SqluiCore.Dialect) {
  return `cosmosdb://AccountEndpoint=some_cosmos_endpoint;AccountKey=some_cosmos_account_key`;
}

// https://docs.microsoft.com/en-us/azure/cosmos-db/sql/sql-api-nodejs-get-started?tabs=windows
function _shouldIncludeField(col: SqluiCore.ColumnMetaData) {
  if (col.name.indexOf('_') !== 0) {
    return true;
  }

  return false;
}

function _getColMapForInsertAndUpdate(columns?: SqluiCore.ColumnMetaData[]) {
  return (
    columns?.reduce((res, col) => {
      if (_shouldIncludeField(col)) {
        switch (col.type) {
          case 'string':
            res[col.name] = '';
            break;
          case 'number':
            res[col.name] = 123;
            break;
          case 'array':
            res[col.name] = [];
            break;
        }
      }

      return res;
    }, {}) || {}
  );
}

// for cosmosdb
export function getRawSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Raw Select All Columns SQL`;

  return {
    label,
    formatter: 'sql',
    query: `SELECT * FROM c`,
  };
}

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

export function getSelectSpecificColumns(
  input: SqlAction.TableInput,
): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  const columnString = input?.columns
    ?.map((col) => `${COSMOSDB_TABLE_ALIAS_PREFIX}.${col.name}`)
    .join(',\n  ');
  const whereColumnString = input?.columns
    ?.map((col) => `${COSMOSDB_TABLE_ALIAS_PREFIX}.${col.name} = ''`)
    .join('\n  AND ');

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

export function getInsert(
  input: SqlAction.TableInput,
  value?: Record<string, any>,
): SqlAction.Output | undefined {
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

export function getUpdateWithValues(
  input: SqlAction.TableInput,
  value: Record<string, any>,
  conditions: Record<string, any>,
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
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  const colMap = _getColMapForInsertAndUpdate(input?.columns);
  colMap['id'] = 'some_id';

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

export function getCreateDatabaseContainer(
  input: SqlAction.DatabaseInput,
): SqlAction.Output | undefined {
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
export function getCreateConnectionDatabase(
  input: SqlAction.ConnectionInput,
): SqlAction.Output | undefined {
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

export const tableActionScripts: SqlAction.TableActionScriptGenerator[] = [
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

export const databaseActionScripts: SqlAction.DatabaseActionScriptGenerator[] = [
  getDivider,
  getCreateDatabase,
  getCreateDatabaseContainer,
  getDivider,
  getDropDatabase,
];

export const connectionActionScripts: SqlAction.ConnectionActionScriptGenerator[] = [
  getDivider,
  getCreateConnectionDatabase,
];
