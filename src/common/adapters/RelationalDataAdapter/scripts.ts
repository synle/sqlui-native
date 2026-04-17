import qs from "qs";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import BaseDataScript, { getDivider } from "src/common/adapters/BaseDataAdapter/scripts";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";
import mariadbIcon from "src/common/adapters/RelationalDataAdapter/mariadb.png";
import mssqlIcon from "src/common/adapters/RelationalDataAdapter/mssql.png";
import mysqlIcon from "src/common/adapters/RelationalDataAdapter/mysql.png";
import postgresIcon from "src/common/adapters/RelationalDataAdapter/postgres.png";
import sqliteIcon from "src/common/adapters/RelationalDataAdapter/sqlite.png";
import { escapeSQLValue, isValueNumber } from "src/frontend/utils/formatter";
import { SqlAction } from "typings";

/** The formatter identifier used for all relational SQL scripts. */
const formatter = "sql";

/**
 * Generates a SELECT * query for the given table.
 * @param input - The table input containing dialect, table ID, and query size.
 * @returns The action output with the query, or undefined if dialect not supported.
 */
export function getSelectAllColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select All Columns`;

  switch (input.dialect) {
    case "mssql":
      return {
        label,
        formatter,
        query: `SELECT TOP ${input.querySize} *
                FROM ${input.tableId}`,
      };
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `SELECT *
                FROM ${input.tableId}
                LIMIT ${input.querySize}`,
      };
  }
}

/**
 * Generates a SELECT COUNT(*) query with WHERE clause for all columns.
 * @param input - The table input containing dialect, table ID, and columns.
 */
export function getSelectCount(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Count`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(" AND \n");

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `SELECT COUNT(*)
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
  }
}

/**
 * Generates a SELECT query listing all columns individually with a WHERE clause.
 * @param input - The table input containing dialect, table ID, columns, and query size.
 */
export function getSelectSpecificColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Specific Columns`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = `\n` + input.columns.map((col) => `  ${col.name}`).join(",\n");
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join("\n AND ");

  switch (input.dialect) {
    case "mssql":
      return {
        label,
        formatter,
        query: `SELECT TOP ${input.querySize} ${columnString}
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
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

/**
 * Generates a SELECT DISTINCT query on the first non-primary-key column.
 * @param input - The table input containing dialect, table ID, columns, and query size.
 */
export function getSelectDistinctValues(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Select Distinct`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns || [];

  const distinctColumn = columns.filter((col) => !col.primaryKey)?.[0]?.name || "some_field";
  const whereColumnString = columns.map((col) => `${col.name} = ''`).join("\n AND ");

  switch (input.dialect) {
    case "mssql":
      return {
        label,
        formatter,
        query: `SELECT DISTINCT TOP ${input.querySize} ${distinctColumn}
                FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
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

/**
 * Generates an INSERT INTO query for a single row.
 * @param input - The table input containing dialect, table ID, and columns.
 * @param value - Optional record of column values to insert.
 */
export function getInsert(input: SqlAction.TableInput, value?: Record<string, any>): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  const columns = input.columns;
  const columnString = columns.map((col) => col.name).join(",\n");
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
    .join(",");

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `INSERT INTO ${input.tableId} (${columnString})
                VALUES (${insertValueString})`,
      };
  }
}

/**
 * Generates a bulk INSERT INTO query for multiple rows.
 * @param input - The table input containing dialect, table ID, and columns.
 * @param rows - Array of row records to insert.
 */
export function getBulkInsert(input: SqlAction.TableInput, rows?: Record<string, any>[]): SqlAction.Output | undefined {
  const label = `Insert`;

  if (!input.columns) {
    return undefined;
  }

  if (!rows || rows.length === 0) {
    return undefined;
  }

  const columns = input.columns;
  const columnString = columns.map((col) => col.name).join(",\n");

  const insertValueRows = rows
    ?.map((row) => {
      const cells = columns
        .map((col) => {
          let valToUse = "";
          if (row?.[col.name] !== undefined) {
            // use the value if it's there
            valToUse = `'${escapeSQLValue(row[col.name])}'`;
          } else {
            valToUse = "null";
          }
          return valToUse;
        })
        .join(",");

      // TODO: see if we need to escape single tick (') for SQL here

      return `(${cells})`;
    })
    .join(", \n");

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `INSERT INTO ${input.tableId} (${columnString})
                VALUES ${insertValueRows}`,
      };
  }
}

/**
 * Generates a template UPDATE query with placeholder values for all columns.
 * @param input - The table input containing dialect, table ID, and columns.
 */
export function getUpdate(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Update`;

  if (!input.columns) {
    return undefined;
  }

  const columnString = input.columns.map((col) => `${col.name} = ''`).join(",\n");
  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(" AND \n");

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
      };
  }
}

/**
 * Generates an UPDATE query with actual values and WHERE conditions.
 * @param input - The table input containing dialect, table ID, and columns.
 * @param value - Record of column names to new values for the SET clause.
 * @param conditions - Record of column names to values for the WHERE clause.
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

      if (!isValueNumber(valToUse)) {
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

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `UPDATE ${input.tableId}
                SET ${columnString}
                WHERE ${whereColumnString}`,
      };
  }
}

/**
 * Generates a DELETE FROM query with a WHERE clause template for all columns.
 * @param input - The table input containing dialect, table ID, and columns.
 */
export function getDelete(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Delete`;

  if (!input.columns) {
    return undefined;
  }

  const whereColumnString = input.columns.map((col) => `${col.name} = ''`).join(" AND \n");

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `DELETE FROM ${input.tableId}
                WHERE ${whereColumnString}`,
      };
  }
}

/**
 * Generates a CREATE TABLE query with dialect-specific column definitions.
 * @param input - The table input containing dialect, table ID, and columns with type info.
 */
export function getCreateTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  if (!input.columns) {
    return undefined;
  }

  let columnString: string = "";

  // map the nested column accordingly (using _ as a separator)
  input.columns = input.columns.map((col) => {
    col.name = col.propertyPath?.join("_") || col.name;
    return col;
  });

  // TODO: figure out how to use the defaultval
  switch (input.dialect) {
    case "mssql":
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? "PRIMARY KEY" : "",
            col.autoIncrement ? "IDENTITY" : "",
            col.allowNull ? "" : "NOT NULL",
          ].join(" "),
        )
        .join(",\n");
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case "postgres":
    case "postgresql":
      columnString = input.columns
        .map((col) => {
          const res = [col.name];

          const colType = col.type.toUpperCase();

          // TODO: better use regex here
          // nextval(employees_employeeid_seq::regclass)
          if (col.primaryKey && col?.defaultValue?.includes("nextval(") && col?.defaultValue?.includes("_seq::regclass)")) {
            res.push("BIGSERIAL PRIMARY KEY");
          } else {
            if (colType.includes("INT") && col.primaryKey) {
              res.push("BIGSERIAL PRIMARY KEY");
            } else {
              res.push(col.type);
              res.push(col.allowNull ? "" : "NOT NULL");
            }
          }

          return res.join(" ");
        })
        .join(",\n");
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case "sqlite":
      columnString = input.columns
        .map((col) => {
          const colType = col.type.toUpperCase();

          return [
            col.name,
            colType.includes("INT") ? "INTEGER" : colType,
            col.primaryKey ? "PRIMARY KEY" : "",
            col.autoIncrement ? "AUTOINCREMENT" : "",
            col.allowNull ? "" : "NOT NULL",
          ].join(" ");
        })
        .join(",\n");
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
    case "mariadb":
    case "mysql":
      columnString = input.columns
        .map((col) =>
          [
            col.name,
            col.type,
            col.primaryKey ? "PRIMARY KEY" : "",
            col.autoIncrement ? "AUTO_INCREMENT" : "",
            col.allowNull ? "" : "NOT NULL",
          ].join(" "),
        )
        .join(",\n");
      return {
        label,
        formatter,
        query: `CREATE TABLE ${input.tableId} (${columnString})`,
      };
  }
}

/**
 * Generates a DROP TABLE query.
 * @param input - The table input containing dialect and table ID.
 */
export function getDropTable(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Table`;

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `DROP TABLE ${input.tableId}`,
      };
  }
}

/**
 * Generates an ALTER TABLE ADD COLUMN query with dialect-specific default type.
 * @param input - The table input containing dialect and table ID.
 */
export function getAddColumn(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Add Column`;

  switch (input.dialect) {
    case "mssql":
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 NVARCHAR(200)`,
      };
    case "postgres":
    case "postgresql":
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 CHAR(200)`,
      };
    case "sqlite":
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 TEXT`,
      };
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `ALTER TABLE ${input.tableId}
                ADD COLUMN newColumn1 varchar(200)`,
      };
  }
}

/**
 * Generates ALTER TABLE DROP COLUMN queries for all columns in the table.
 * @param input - The table input containing dialect, table ID, and columns.
 */
export function getDropColumns(input: SqlAction.TableInput): SqlAction.Output | undefined {
  const label = `Drop Column`;

  if (!input.columns) {
    return undefined;
  }

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: input.columns
          .map(
            (col) => `ALTER TABLE ${input.tableId}
                         DROP COLUMN ${col.name};`,
          )
          .join("\n"),
      };
  }
}

/**
 * Generates a DROP DATABASE query.
 * @param input - The database input containing dialect and database ID.
 */
export function getDropDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Drop Database`;

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `DROP DATABASE ${input.databaseId}`,
      };
  }
}

/**
 * Generates a CREATE DATABASE query.
 * @param input - The database input containing dialect and database ID.
 */
export function getCreateDatabase(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `CREATE DATABASE ${input.databaseId}`,
      };
  }
}

/**
 * Generates a CREATE TABLE query for a sample "mocked_table" with dialect-specific syntax.
 * @param input - The database input containing dialect info.
 */
export function getCreateSampleTable(input: SqlAction.DatabaseInput): SqlAction.Output | undefined {
  const label = `Create Table`;

  let query = "";

  switch (input.dialect) {
    case "mssql":
      query = `
        CREATE TABLE mocked_table
        (
          id INTEGER PRIMARY KEY IDENTITY NOT NULL,
          name NVARCHAR(120)
        );
      `;
      break;
    case "postgres":
    case "postgresql":
      query = `
        CREATE TABLE mocked_table
        (
          id BIGSERIAL PRIMARY KEY,
          name CHAR(120)
        );
      `;
      break;
    case "sqlite":
      query = `
        CREATE TABLE mocked_table (
          id INTEGER PRIMARY KEY NOT NULL,
          name NVARCHAR(120)
        )
      `;
      break;
    case "mariadb":
    case "mysql":
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

/**
 * Generates a CREATE DATABASE template query for connection-level actions.
 * @param input - The connection input containing dialect info.
 */
export function getCreateConnectionDatabase(input: SqlAction.ConnectionInput): SqlAction.Output | undefined {
  const label = `Create Database`;

  switch (input.dialect) {
    case "mssql":
    case "postgres":
    case "postgresql":
    case "sqlite":
    case "mariadb":
    case "mysql":
      return {
        label,
        formatter,
        query: `CREATE DATABASE some_database_name`,
      };
  }
}

/**
 * Concrete script implementation for relational databases (MySQL, MariaDB, MSSQL, PostgreSQL, SQLite).
 * Provides SQL script generation, dialect icons, sample connections, and code snippets.
 */
export class ConcreteDataScripts extends BaseDataScript {
  dialects = ["mysql", "mariadb", "mssql", "postgres", "postgresql", "sqlite"];

  /**
   * Returns connection form inputs. SQLite only needs a file path; other dialects use the default fields.
   * @param dialect - The specific relational dialect.
   */
  getConnectionFormInputs(dialect?: string) {
    if (dialect === "sqlite") {
      return [["path", "SQLite File Path"]];
    }
    return super.getConnectionFormInputs(dialect);
  }

  /** Returns false because table ID is inferred from the query for relational databases. */
  getIsTableIdRequiredForQuery() {
    return false;
  }

  /** Returns the Monaco syntax mode identifier for relational SQL. */
  getSyntaxMode() {
    return "sql";
  }

  /** Returns true because relational databases support data migration. */
  supportMigration() {
    return true;
  }

  /** Returns true because relational databases support the create record form. */
  supportCreateRecordForm() {
    return true;
  }

  /** Returns true because relational databases support the edit record form. */
  supportEditRecordForm() {
    return true;
  }

  /** Returns true because relational databases support the relationship visualization chart. */
  supportVisualization() {
    return true;
  }

  /**
   * Returns the icon asset for the given relational dialect.
   * @param dialect - The SQL dialect identifier (e.g., "mysql", "postgres").
   * @returns The imported PNG icon for the dialect.
   */
  getDialectIcon(dialect) {
    switch (dialect) {
      case "mysql":
        return mysqlIcon;
      case "mariadb":
        return mariadbIcon;
      case "mssql":
        return mssqlIcon;
      case "postgres":
      case "postgresql":
        return postgresIcon;
      case "sqlite":
        return sqliteIcon;
      default:
        return super.getDialectIcon(dialect);
    }
  }

  /**
   * Returns the ordered list of table-level script generators for relational databases.
   * @returns Array of script generator functions for table operations.
   */
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

  /**
   * Returns the ordered list of database-level script generators for relational databases.
   * @returns Array of script generator functions for database operations.
   */
  getDatabaseScripts() {
    return [getDivider, getDropDatabase, getCreateDatabase, getDivider, getCreateSampleTable];
  }

  /**
   * Returns the ordered list of connection-level script generators for relational databases.
   * @returns Array of script generator functions for connection operations.
   */
  getConnectionScripts() {
    return [getDivider, getCreateConnectionDatabase];
  }

  /**
   * Returns a sample connection string for the given relational dialect.
   * @param dialect - The SQL dialect identifier.
   * @returns A sample connection URL string.
   */
  getSampleConnectionString(dialect) {
    switch (dialect) {
      case "mssql":
        return `mssql://sa:password123!@localhost:1433`;
      case "postgres":
      case "postgresql":
        return `postgres://postgres:password@localhost:5432`;
      case "sqlite":
        return `sqlite://test-db.sqlite`;
      case "mariadb":
        return `mariadb://root:password@localhost:3306`;
      case "mysql":
        return `mysql://root:password@localhost:3306`;
      default: // Not supported dialect
        return "";
    }
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
   * Generates a connection code snippet for the given language and dialect.
   * @param connection - The connection metadata including dialect and connection string.
   * @param query - The query context including SQL, database, and table identifiers.
   * @param language - The target language ("javascript", "python", or "java").
   * @returns A rendered code snippet string, or empty string if unsupported.
   */
  getCodeSnippet(connection, query, language) {
    const sql = query.sql;
    const database = query.databaseId;

    // resolve the engine name for code snippet templates
    const engineMap: Record<string, string> = {
      mysql: "mysql",
      mariadb: "mysql",
      mssql: "mssql",
      postgres: "postgres",
      postgresql: "postgres",
      sqlite: "sqlite",
    };
    const engine = engineMap[connection.dialect || ""] || "";
    if (!engine) return "";

    // parse connection parameters for non-sqlite dialects
    let connectionString = connection.connection;
    connectionString = connectionString.replace("sslmode=require", "sslmode=no-verify");

    let host = "";
    let port: string | number = "";
    let username = "";
    let password = "";

    if (connection.dialect !== "sqlite") {
      //@ts-ignore
      const params = BaseDataAdapter.getConnectionParameters(connectionString);
      host = params?.hosts?.[0]?.host || "localhost";
      port = params?.hosts?.[0]?.port || "";
      username = params?.username || "";
      password = params?.password || "";

      // build full connection URL with database
      if (database) {
        //@ts-ignore
        const { scheme, options } = params || {};

        connectionString = `${scheme}://`;
        if (username && password) {
          connectionString += `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
        }
        connectionString += `@${host}:${port}`;
        connectionString += `/${database}`;
        if (options) {
          connectionString += `?${qs.stringify(options)}`;
        }
      }
    }

    switch (language) {
      case "javascript": {
        switch (connection.dialect) {
          case "sqlite": {
            const storagePath = connectionString.replace("sqlite://", "").replace(/\\/g, "/");
            return renderCodeSnippet("javascript", engine as any, { storagePath, sql });
          }
          case "mssql":
            return renderCodeSnippet("javascript", engine as any, {
              host,
              port,
              username,
              password,
              database: database || "",
              sql,
            });
          case "mysql":
          case "mariadb": {
            let mysqlConnStr = connectionString;
            if (connection.dialect === "mariadb") {
              mysqlConnStr = mysqlConnStr.replace("mariadb://", "mysql://");
            }
            return renderCodeSnippet("javascript", engine as any, { connectionString: mysqlConnStr, sql });
          }
          case "postgres":
          case "postgresql":
            return renderCodeSnippet("javascript", engine as any, { connectionString, sql });
          default:
            return "";
        }
      }
      case "python": {
        switch (connection.dialect) {
          case "sqlite": {
            const storagePath = connectionString.replace("sqlite://", "").replace(/\\/g, "/");
            return renderCodeSnippet("python", engine as any, { storagePath, sql });
          }
          case "mssql":
            return renderCodeSnippet("python", engine as any, {
              host,
              port,
              username,
              password,
              database: database || "",
              sql,
            });
          case "mysql":
          case "mariadb":
            return renderCodeSnippet("python", engine as any, {
              host,
              port: port || 3306,
              username,
              password,
              database: database || "",
              sql,
            });
          case "postgres":
          case "postgresql":
            return renderCodeSnippet("python", engine as any, { connectionString, sql });
          default:
            return "";
        }
      }
      case "java": {
        let jdbcUrl = "";
        let gradleDep = "";
        let dbDescription = "";

        switch (connection.dialect) {
          case "sqlite":
            jdbcUrl = `jdbc:sqlite:${connectionString.replace("sqlite://", "")}`;
            gradleDep = `    implementation 'org.xerial:sqlite-jdbc:3.45.1.0'`;
            dbDescription = jdbcUrl;
            break;
          case "mysql":
            jdbcUrl = `jdbc:${connectionString}`;
            gradleDep = `    implementation 'com.mysql:mysql-connector-j:8.3.0'`;
            dbDescription = connectionString;
            break;
          case "mariadb":
            jdbcUrl = `jdbc:${connectionString}`;
            gradleDep = `    implementation 'org.mariadb.jdbc:mariadb-java-client:3.3.2'`;
            dbDescription = connectionString;
            break;
          case "postgres":
          case "postgresql": {
            const pgConn = connectionString.replace(/^postgres(ql)?:\/\//, "");
            jdbcUrl = `jdbc:postgresql://${pgConn}`;
            gradleDep = `    implementation 'org.postgresql:postgresql:42.7.1'`;
            dbDescription = connectionString;
            break;
          }
          case "mssql": {
            let mssqlJdbc = `jdbc:sqlserver://${host}:${port}`;
            if (username) mssqlJdbc += `;user=${username}`;
            if (password) mssqlJdbc += `;password=${password}`;
            if (database) mssqlJdbc += `;databaseName=${database}`;
            mssqlJdbc += `;encrypt=true;trustServerCertificate=true`;
            jdbcUrl = mssqlJdbc;
            gradleDep = `    implementation 'com.microsoft.sqlserver:mssql-jdbc:12.4.2.jre11'`;
            dbDescription = connectionString;
            break;
          }
          default:
            return "";
        }

        const escapedSql = sql.replace(/"/g, '\\"');

        return renderCodeSnippet(
          "java",
          engine as any,
          { jdbcUrl, escapedSql },
          {
            connectDescription: dbDescription,
            gradleDep,
            mainJavaComment: `/**
 * src/main/java/Main.java
 *
 * Connects to:
 * ${dbDescription}
 *
 * This example:
 * - Connects to your DB
 * - Runs the query and prints results
 * - Does NOT modify anything (unless your query does)
 *
 * Run:
 * ./gradlew run
 */`,
          },
        );
      }
      default:
        return "";
    }
  }
}

export default new ConcreteDataScripts();
