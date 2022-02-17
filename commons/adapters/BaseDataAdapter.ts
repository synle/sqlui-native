import { ConnectionStringParser } from 'connection-string-parser';
import { SqluiCore } from '../../typings';

export const MAX_CONNECTION_TIMEOUT = 3000;

export default abstract class BaseDataAdapter {
  protected connectionOption: string;
  public dialect?: SqluiCore.Dialect;

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;
  }

  /**
   * get dialect string from a connection string
   * @param {string} connection in the uri scheme (cassandra://localhost:9042)
   * @return {string} the dialect, in this case, it's cassandra
   */
  static getDialect(connection: string): string | undefined {
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
    const dialect = BaseDataAdapter.getDialect(connection);
    switch (BaseDataAdapter.getDialect(connection)) {
      case 'mysql':
      case 'mariadb':
      case 'mssql':
      case 'postgres':
      case 'sqlite':
      case 'cassandra':
      case 'mongodb':
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
  static resolveTypes(inputItem: any) {
    const stack: {
      item: any;
      path: string[];
    }[] = [{ item: inputItem, path: [] }];

    const columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};

    while (stack.length > 0) {
      //@ts-ignore
      const { item, path } = stack.pop();
      const type = typeof item;
      if (type === 'object' && !Array.isArray(item)) {
        for (const key of Object.keys(item)) {
          stack.push({
            item: item[key],
            path: [...path, key],
          });
        }
      } else {
        const key = path.join('.');
        columnsMap[key] = columnsMap[key] || {
          name: key,
          type: Array.isArray(item) ? 'array' : type,
        };
      }
    }

    return columnsMap;
  }
}
