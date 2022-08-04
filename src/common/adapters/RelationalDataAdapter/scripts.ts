import BaseDataScript, { getDivider } from 'src/common/adapters/BaseDataAdapter/scripts';
import { escapeSQLValue, isValueNumber } from 'src/frontend/utils/formatter';
import { SqlAction, SqluiCore } from 'typings';

const formatter = 'sql';

export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `SELECT TOP ${input.querySize} *
                FROM ${input.tableId}`,
      };
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT *
                FROM ${input.tableId}
                LIMIT ${input.querySize}`,
      };
  }
}

export function getSelectCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Count`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT COUNT(*)
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
  }
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

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `SELECT TOP ${input.querySize} ${columnString}
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT ${columnString}
                FROM ${input.tableId}
                WHERE ${whereColumnString}
                LIMIT ${input.querySize}`,
      };
  }
}

export function getSelectDistinctValues(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Distinct`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns || [];

  const distinctColumn = columns.filter((col) => !col.primaryKey)?.[0]?.name || 'some_field';
  const whereColumnString = columns.map((col) => `${col.name} = ''`).join('\n AND ');

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `SELECT DISTINCT TOP ${input.querySize} ${distinctColumn}
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `SELECT DISTINCT ${distinctColumn}
                FROM ${input.tableId}
                WHERE ${whereColumnString}
                LIMIT ${input.querySize}`,
      };
  }
}

export function getInsert(
  input: SqlAction.TableInput,
  value?: Record<string, any>,
): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns;
  const columnString = columns.map((col) => col.name).join(',\n');
  const insertValueString = columns
    .map((col) => {
      if (value?.[col.name] === null) {
        return `null`;
      }
      if (value?.[col.name] !== undefined) {
        // use the value if it's there
        return `'${escapeSQLValue(value[col.name])}'`;
      }
      return `'_${col.name}_'`; // use the default value
    })
    .join(',');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `INSERT INTO ${input.tableId} (${columnString})
                VALUES (${insertValueString})`,
      };
  }
}

// TODO: add a flag to allow keeping the primary key or consistent id
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

  const columns = input.columns;
  const columnString = columns.map((col) => col.name).join(',\n');

  const insertValueRows = rows
    ?.map((row) => {
      const cells = columns
        .map((col) => {
          let valToUse = '';
          if (row?.[col.name] !== undefined) {
            // use the value if it's there
            valToUse = `'${escapeSQLValue(row[col.name])}'`;
          } else {
            valToUse = 'null';
          }
          return valToUse;
        })
        .join(',');

      // TODO: see if we need to escape single tick (') for SQL here

      return `(${cells})`;
    })
    .join(', \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `INSERT INTO ${input.tableId} (${columnString})
                VALUES ${insertValueRows}`,
      };
  }
}

export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => `${col.name} = ''`).join(',\n');
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
      };
  }
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

      if (!isValueNumber(valToUse)) {
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

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
      };
  }
}

export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(' AND \n');

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `DELETE FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
  }
}

export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

  let columnString: string = '';

  // map the nested column accordingly (using _ as a separator)
  input.columns = input.columns.map((col) => {
    col.name = col.propertyPath?.join('_') || col.name;
    return col;
  });

  // TODO: figure out how to use the defaultval
  switch (input.dialect) {
    case 'mssql':
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? 'PRIMARY KEY' : '',
            col.autoIncrement ? 'IDENTITY' : '',
            col.allowNull ? '' : 'NOT NULL',
          ].join(' '),
        )
        .join(',\n');
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case 'postgres':
      columnString = input.columns
        .map((col) => {
          const res = [col.name];

          const colType = col.type.toUpperCase();

          // TODO: better use regex here
          // nextval(employees_employeeid_seq::regclass)
          if (
            col.primaryKey &&
            col?.defaultValue?.includes('nextval(') &&
            col?.defaultValue?.includes('_seq::regclass)')
          ) {
            res.push('BIGSERIAL PRIMARY KEY');
          } else {
            if (colType.includes('INT') && col.primaryKey) {
              res.push('BIGSERIAL PRIMARY KEY');
            } else {
              res.push(col.type);
              res.push(col.allowNull ? '' : 'NOT NULL');
            }
          }

          return res.join(' ');
        })
        .join(',\n');
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case 'sqlite':
      columnString = input.columns
        .map((col) => {
          const colType = col.type.toUpperCase();

          return [
            col.name,
            colType.includes('INT') ? 'INTEGER' : colType,
            col.primaryKey ? 'PRIMARY KEY' : '',
            col.autoIncrement ? 'AUTOINCREMENT' : '',
            col.allowNull ? '' : 'NOT NULL',
          ].join(' ');
        })
        .join(',\n');
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case 'mariadb':
    case 'mysql':
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? 'PRIMARY KEY' : '',
            col.autoIncrement ? 'AUTO_INCREMENT' : '',
            col.allowNull ? '' : 'NOT NULL',
          ].join(' '),
        )
        .join(',\n');
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
  }
}

export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `DROP TABLE ${input.tableId}`,
      };
  }
}

export function getAddColumn(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Add Column`;

  switch (input.dialect) {
    case 'mssql':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 NVARCHAR(200)`,
      };
    case 'postgres':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 CHAR(200)`,
      };
    case 'sqlite':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 TEXT`,
      };
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 varchar(200)`,
      };
  }
}

export function getDropColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Column`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: input.columns
          .map(
            (col) => `ALTER TABLE ${input.tableId}
                         DROP COLUMN ${col.name};`,
          )
          .join('\n'),
      };
  }
}

export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `DROP DATABASE ${input.databaseId}`,
      };
  }
}

export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `CREATE DATABASE ${input.databaseId}`,
      };
  }
}

export function getCreateSampleTable(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  let query = '';

  switch (input.dialect) {
    case 'mssql':
      query = `
        CREATE TABLE mocked_table
        (
          id INTEGER PRIMARY KEY IDENTITY NOT NULL,
          name NVARCHAR(120)
        );
      `;
      break;
    case 'postgres':
      query = `
        CREATE TABLE mocked_table
        (
          id BIGSERIAL PRIMARY KEY,
          name CHAR(120)
        );
      `;
      break;
    case 'sqlite':
      query = `
        CREATE TABLE mocked_table (
          id INTEGER PRIMARY KEY NOT NULL,
          name NVARCHAR(120)
        )
      `;
      break;
    case 'mariadb':
    case 'mysql':
      query = `
        CREATE TABLE mocked_table
        (
          id INTEGER PRIMARY KEY AUTO_INCREMENT NOT NULL,
          name NVARCHAR(120)
        );
      `;
      break;
  }

  return {
    label,
    formatter,
    query,
    skipGuide: true,
  };
}

export function getCreateConnectionDatabase(
  input: SqlAction.ConnectionInput,
): SqlAction.Output | undefined {
  const label = `Create Database`;

  switch (input.dialect) {
    case 'mssql':
    case 'postgres':
    case 'sqlite':
    case 'mariadb':
    case 'mysql':
      return {
        label,
        formatter,
        query: `CREATE DATABASE some_database_name`,
      };
  }
}

export class ConcreteDataScripts extends BaseDataScript {
  dialects = ['mysql', 'mariadb', 'mssql', 'postgres', 'sqlite'];

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
      getSelectCount,
      getSelectSpecificColumns,
      getSelectDistinctValues,
      getDivider,
      getInsert,
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
    return [getDivider, getDropDatabase, getCreateDatabase, getDivider, getCreateSampleTable];
  }

  getConnectionScripts() {
    return [getDivider, getCreateConnectionDatabase];
  }

  getSampleConnectionString(dialect) {
    switch (dialect) {
      case 'mssql':
        return `mssql://sa:password123!@localhost:1433`;
      case 'postgres':
        return `postgres://postgres:password@localhost:5432`;
      case 'sqlite':
        return `sqlite://test-db.sqlite`;
      case 'mariadb':
        return `mariadb://root:password@localhost:3306`;
      case 'mysql':
        return `mysql://root:password@localhost:3306`;
      default: // Not supported dialect
        return '';
    }
  }

  getSampleSelectQuery(actionInput: SqlAction.TableInput) {
    return getSelectAllColumns(actionInput);
  }

  // sample code snippet
  getCodeSnippet(connection: string, database: string, language: SqluiCore.LanguageMode, sql: string) {
    switch (language) {
      case 'javascript':
        return `
// install these extra dependencies if needed
// npm install --save sequelize
// npm install --save pg pg-hstore # optional - Postgres
// npm install --save mysql2 # optional
// npm install --save mariadb # optional
// npm install --save sqlite3 # optional
// npm install --save tedious # optional - Microsoft SQL Server
const {Sequelize} = require('sequelize');

async function _doWork(){
  const sequelize = new Sequelize('${connection}');

  try{
    const [items, meta] = await sequelize.query(\`${sql}\`, {
      raw: true,
      plain: false,
    });

    for(const item of items){
      console.log(item);
    }
  } catch(err){
    console.log('Failed to run query', err);
  }
}

_doWork();
        `.trim();
      case 'python':
        // NOTE: for sqlite, sqlalchemy needs an extra /
        connection = connection.replace('sqlite://', 'sqlite:///')
          .replace('postgres://', 'postgresql://')//SQLAlchemy used to accept both, but has removed support for the postgres name - https://stackoverflow.com/questions/62688256/sqlalchemy-exc-nosuchmoduleerror-cant-load-plugin-sqlalchemy-dialectspostgre

        // if there is a database, then append it
        if (database){
          connection += `/${database}`;
        }

        return `
# python3 -m venv ./ # setting up virtual environment with
# source bin/activate # activate the venv profile
# pip install sqlalchemy
# pip install mysqlclient # optional - for MySQL
# pip install psycopg2-binary # optional - for Postgres
# pip install pyodbc # optional - for MSSQL

from sqlalchemy import create_engine
from sqlalchemy.sql import text

engine = create_engine('${connection}', echo = True)

with engine.connect() as con:
  rs = con.execute("""${sql}""")

  for row in rs:
    print(row)
        `.trim();
      default:
        return '';
    }
  }
}

export default new ConcreteDataScripts();
