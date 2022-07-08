import { ConnectionStringParser } from 'connection-string-parser';
import { SqluiCore } from 'typings';

export const MAX_CONNECTION_TIMEOUT = 3000;

export default abstract class BaseDataAdapter {
  protected connectionOption: string;
  public dialect?: SqluiCore.Dialect;

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;
  }

  protected getConnectionString(): string {
    return this.connectionOption.replace(`${this.dialect}://`, '');
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

    if (dialect) {
      const connectionStringParser = new ConnectionStringParser({
        scheme: dialect,
        hosts: [],
      });
      return connectionStringParser.parse(connection);
    }

    // not supported
    return undefined;
  }

  static resolveTypes(inputItem: any) {
    const stack: {
      item: any;
      path: string[];
      key: string;
    }[] = [{ item: inputItem, path: [], key: '' }];

    const columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};
    const visited = new Set<string>();
    while (stack.length > 0) {
      //@ts-ignore
      const { item, path, key } = stack.pop();
      const type = Array.isArray(item) ? 'array' : typeof item;
      if (type === 'object') {
        for (const targetKey of Object.keys(item)) {
          const newPath = [...path, targetKey];
          const newKey = newPath.join('/');

          if (!visited.has(newKey)) {
            stack.push({
              item: item[targetKey],
              path: newPath,
              key: newKey,
            });

            visited.add(newKey);
          }
        }
      } else {
        columnsMap[key] = columnsMap[key] || {
          name: key,
          type: type,
          propertyPath: path,
          nested: path.length > 1, // whether or not this is a complex type and nested inside another JSON
        };
      }
    }

    return columnsMap;
  }

  static inferTypesFromItems(items: any): SqluiCore.ColumnMetaData[] {
    let columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};

    for (const item of items) {
      columnsMap = {
        ...columnsMap,
        ...BaseDataAdapter.resolveTypes(item),
      };
    }

    return Object.values(columnsMap);
  }
}
