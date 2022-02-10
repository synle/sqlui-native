import { SqluiCore,SqlAction } from 'typings';
import {getDivider} from 'src/data/sql'

const MONGO_ADAPTER_PREFIX = 'db';

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case 'mongodb':
      return {
        label,
        formatter: 'sql',
        query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find().limit(${input.querySize}).toArray();`,
      };
  }
}

export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join('\n -- AND ');

  switch (input.dialect) {
    case 'mongodb':
      const insertValueObject = {};
      for (const column of input.columns || []) {
        if (!column.name.includes('.')) {
          //@ts-ignore
          insertValueObject[column.name] = column.type === 'string' ? '' : 123;
        }
      }
      return {
        label,
        formatter: 'sql',
        query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').find(
          ${JSON.stringify(insertValueObject)}
        ).limit(${input.querySize}).toArray();`,
      };
  }
}

export function getInsertCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => col.name).join(',\n');
  const insertValueString = input.columns.map((col) => `'_${col.name}_'`).join(',\n');

  switch (input.dialect) {
    case 'mongodb':
      const insertValueObject = {};
      for (const column of input.columns) {
        if (column.name !== '_id' && !column.name.includes('.')) {
          //@ts-ignore
          insertValueObject[column.name] = column.type === 'string' ? '' : 123;
        }
      }
      return {
        label,
        formatter: 'js',
        query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').insertMany([
          ${JSON.stringify(insertValueObject)}
        ]);`,
      };
  }
}

export function getUpdateCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => `-- ${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mongodb':
      const insertValueObject = {};
      for (const column of input.columns) {
        if (column.name !== '_id' && !column.name.includes('.')) {
          //@ts-ignore
          insertValueObject[column.name] = column.type === 'string' ? '' : 123;
        }
      }
      return {
        label,
        formatter: 'js',
        query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').update(
          ${JSON.stringify(insertValueObject)},
          {\$set: ${JSON.stringify(insertValueObject, null, 2)}}
        );`,
      };
  }
}

export function getDeleteCommand(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `-- ${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mongodb':
      const insertValueObject = {};
      for (const column of input.columns) {
        if (column.name !== '_id' && !column.name.includes('.')) {
          //@ts-ignore
          insertValueObject[column.name] = column.type === 'string' ? '' : 123;
        }
      }
      return {
        label,
        formatter: 'js',
        query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').deleteMany(
          ${JSON.stringify(insertValueObject)}
        );`,
      };
  }
}

export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

  let columnString: string = '';

  // TODO: figure out how to use the defaultval
  switch (input.dialect) {
    case 'mongodb':
      return {
        label,
        formatter: 'js',
        query: `${MONGO_ADAPTER_PREFIX}.createCollection("${input.tableId}")`,
      };
  }
}

export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  switch (input.dialect) {
    case 'mongodb':
      return {
        label,
        formatter: 'js',
        query: `${MONGO_ADAPTER_PREFIX}.collection('${input.tableId}').drop()`,
      };
  }
}


export const scripts= [
getSelectAllColumns,
    getSelectSpecificColumns,
    getInsertCommand,
    getUpdateCommand,
    getDeleteCommand,
    getDivider,
    getCreateTable,
    getDropTable]
