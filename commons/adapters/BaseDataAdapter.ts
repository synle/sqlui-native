import { ConnectionStringParser } from 'connection-string-parser';
import { SqluiCore } from '../../typings';

export default abstract class BaseDataAdapter {
  protected connectionOption: string;
  public dialect?: SqluiCore.Dialect;

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;
  }

  static getParsedDialect(connection: string) {
    try {
      return connection.substr(0, connection.indexOf(':')).toLowerCase();
    } catch (err) {
      return undefined;
    }
  }

  /**
   * this method will parse connection string into connection parameters
   *
   * @param {string} connection in the uri scheme (cassandra://localhost:9042)
   */
  static getConnectionParameters(connection: string) {
    const dialect = BaseDataAdapter.getParsedDialect(connection);
    switch (BaseDataAdapter.getParsedDialect(connection)) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
      case 'cassandra':
        if (dialect) {
          const connectionStringParser = new ConnectionStringParser({
            scheme: dialect,
            hosts: [],
          });
          return connectionStringParser.parse(connection);
        }
        break;
    }

    // not supported
    return undefined;
  }
}
