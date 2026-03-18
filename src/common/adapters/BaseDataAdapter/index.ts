import { ConnectionStringParser } from "connection-string-parser";
import { getDialectType, getDialectTypeFromConnectionString } from "src/common/adapters/DataScriptFactory";
import { SqluiCore } from "typings";

/** Maximum timeout in milliseconds for establishing a database connection. */
export const MAX_CONNECTION_TIMEOUT = 15000;

/**
 * Abstract base class for all database adapters. Provides shared utilities
 * for connection string parsing and type inference.
 */
export default abstract class BaseDataAdapter {
  /** The raw connection string/option used to connect. */
  protected connectionOption: string;
  /** The resolved database dialect. */
  public dialect?: SqluiCore.Dialect;

  /**
   * @param connectionOption - The connection string URI (e.g., "mysql://user:pass@host:port").
   */
  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;
    this.dialect = getDialectType(connectionOption);
  }

  /**
   * Returns the connection string with the protocol scheme stripped.
   * @returns The connection string without the leading scheme (e.g., "mysql://").
   */
  protected getConnectionString(): string {
    return this.connectionOption.replace(/^[a-z0-9+]+:\/\//i, "");
  }

  /**
   * this method will parse connection string into connection parameters
   *
   * @param {string} connection in the uri scheme (cassandra://localhost:9042)
   */
  static getConnectionParameters(connection: string) {
    // NOTE: here we only want to parse,
    // therefore will pull the database scheme from the URL
    const dialect = getDialectTypeFromConnectionString(connection);

    if (dialect) {
      const connectionStringParser = new ConnectionStringParser({
        scheme: dialect,
        hosts: [],
      });

      try {
        let res = connectionStringParser.parse(connection);

        if (!res || Object.keys(res).length === 0) {
          try {
            // here we attempt to encode and retry parser
            const connectionParts = connection.replace(`${dialect}://`, "").split(/[:@]/);
            if (connectionParts.length === 4) {
              // there are 4 parts: username, password, host, port
              const [username, password, host, port] = connectionParts.map(encodeURIComponent);
              res = connectionStringParser.parse(`${dialect}://${username}:${password}@${host}:${port}`);
            }
          } catch (err) {
            console.error("index.ts:parse", err);
          }
        }

        if (Object.keys(res).length > 0) {
          return res;
        }
      } catch (err2) {
        console.error("BaseDataAdapter:parseConnectionString", err2);
      }
    }

    // not supported
    return undefined;
  }

  /**
   * Recursively resolves types from a nested object, producing a flat column metadata map.
   * @param inputItem - The object to resolve types from.
   * @param incomingTypeConverter - Optional function to convert type strings to dialect-specific types.
   * @returns A map of column paths to their metadata.
   */
  static resolveTypes(inputItem: any, incomingTypeConverter?: (type: string, value: any) => string) {
    const stack: {
      item: any;
      path: string[];
      key: string;
    }[] = [{ item: inputItem, path: [], key: "" }];

    const onTypeConverter = (type: string, value: any) => {
      // override the number to be more specific (integer vs float)
      if (type === "number") {
        if (Number.isInteger(value)) {
          type = "integer";
        } else {
          type = "float";
        }
      }

      if (incomingTypeConverter) {
        return incomingTypeConverter(type, value);
      }

      return type;
    };

    const columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};
    const visited = new Set<string>();
    while (stack.length > 0) {
      //@ts-ignore
      const { item, path, key } = stack.pop();
      const type = Array.isArray(item) ? "array" : typeof item;
      if (item === null || item === undefined) {
        // TODO: if item has a null or undefined, let's set the allow null flag
      } else if (type === "object") {
        for (const targetKey of Object.keys(item)) {
          const newPath = [...path, targetKey];
          const newKey = newPath.join("/");

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
        // TODO: figure out the max length
        columnsMap[key] = {
          ...(columnsMap[key] || {}),
          name: key,
          propertyPath: path,
          type: onTypeConverter(type, item),
          nested: path.length > 1, // whether or not this is a complex type and nested inside another JSON
        };
      }
    }

    return columnsMap;
  }

  /**
   * Infers column metadata (names and JavaScript types) from an array of data items.
   * @param items - Array of objects to infer types from.
   * @returns Array of column metadata with inferred types.
   */
  static inferTypesFromItems(items: any[]): SqluiCore.ColumnMetaData[] {
    let columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};

    for (const item of items) {
      columnsMap = {
        ...columnsMap,
        ...BaseDataAdapter.resolveTypes(item),
      };
    }

    return Object.values(columnsMap);
  }
  /**
   * Infers column metadata with dialect-specific SQL types from an array of data items.
   * @param items - Array of objects to infer types from.
   * @param toDialectHint - Optional dialect hint to produce dialect-specific type names (e.g., "INTEGER", "TEXT").
   * @returns Array of column metadata with SQL-compatible types.
   */
  static inferSqlTypeFromItems(items: any[], toDialectHint?: string): SqluiCore.ColumnMetaData[] {
    let columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};

    for (const item of items) {
      columnsMap = {
        ...columnsMap,
        ...BaseDataAdapter.resolveTypes(item, (type: string) => {
          switch (type) {
            case "float":
              switch (toDialectHint) {
                case "mysql":
                case "mariadb":
                case "mssql":
                case "postgres":
                case "postgresql":
                case "sqlite":
                case "cassandra":
                  return "FLOAT";
                case "mongodb":
                case "redis":
                case "rediss":
                case "cosmosdb":
                case "aztable":
                default:
                  return type;
              }
            case "integer":
              switch (toDialectHint) {
                case "mysql":
                case "mariadb":
                case "mssql":
                case "postgres":
                case "postgresql":
                case "sqlite":
                  return "INTEGER";
                case "cassandra":
                  return "INT";
                case "mongodb":
                case "redis":
                case "rediss":
                case "cosmosdb":
                case "aztable":
                default:
                  return type;
              }
            case "boolean":
              switch (toDialectHint) {
                case "mssql":
                  return "BIT";
                case "mysql":
                case "mariadb":
                case "postgres":
                case "postgresql":
                case "sqlite":
                case "cassandra":
                  return "BOOLEAN";
                case "mongodb":
                case "redis":
                case "rediss":
                case "cosmosdb":
                case "aztable":
                default:
                  return type;
              }
            default:
              // TODO: should pick up nvarchar vs text instead of default to text
              switch (toDialectHint) {
                case "mysql":
                case "mariadb":
                case "mssql":
                case "postgres":
                case "postgresql":
                case "sqlite":
                case "cassandra":
                  return "TEXT";
                case "mongodb":
                case "redis":
                case "rediss":
                case "cosmosdb":
                case "aztable":
                default:
                  return type;
              }
          }
        }),
      };
    }

    return Object.values(columnsMap);
  }
}
