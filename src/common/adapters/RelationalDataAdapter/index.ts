/** Factory function for creating dialect-specific relational data adapters. */
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { getDialectType } from "src/common/adapters/DataScriptFactory";
import MariaDBDataAdapter from "src/common/adapters/RelationalDataAdapter/mariadb/index";
import MSSQLDataAdapter from "src/common/adapters/RelationalDataAdapter/mssql/index";
import MySQLDataAdapter from "src/common/adapters/RelationalDataAdapter/mysql/index";
import PostgresDataAdapter from "src/common/adapters/RelationalDataAdapter/postgres/index";
import SQLiteDataAdapter from "src/common/adapters/RelationalDataAdapter/sqlite/index";

/**
 * Creates the appropriate relational data adapter based on the connection string dialect.
 * @param connectionOption - The connection URL string (e.g., "mysql://root:pass@localhost:3306").
 * @returns An IDataAdapter instance for the detected dialect.
 * @throws Error if the dialect is not a supported relational dialect.
 */
export default function createRelationalDataAdapter(connectionOption: string): IDataAdapter {
  const dialect = getDialectType(connectionOption);

  switch (dialect) {
    case "sqlite":
      return new SQLiteDataAdapter(connectionOption);
    case "mysql":
      return new MySQLDataAdapter(connectionOption);
    case "mariadb":
      return new MariaDBDataAdapter(connectionOption);
    case "mssql":
      return new MSSQLDataAdapter(connectionOption);
    case "postgres":
    case "postgresql":
      return new PostgresDataAdapter(connectionOption);
    default:
      throw new Error(`Unsupported relational dialect: ${dialect}`);
  }
}
