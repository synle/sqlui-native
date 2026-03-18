import * as cassandra from "cassandra-driver";
import BaseDataAdapter from "src/common/adapters/BaseDataAdapter/index";
import { getClientOptions } from "src/common/adapters/CassandraDataAdapter/utils";
import IDataAdapter from "src/common/adapters/IDataAdapter";
import { SqluiCore } from "typings";

/** Data adapter for Apache Cassandra connections (including CosmosDB Cassandra API). */
export default class CassandraDataAdapter extends BaseDataAdapter implements IDataAdapter {
  /**
   * cassandra version
   * @type {number}
   */
  version?: string;
  /** Whether the connected Cassandra instance is version 2.x. */
  isCassandra2?: boolean;
  private _connection?: cassandra.Client;

  private async getConnection(database?: string): Promise<cassandra.Client> {
    // attempt to pull in connections
    return new Promise<cassandra.Client>(async (resolve, reject) => {
      try {
        const rawClientOptions = getClientOptions(this.connectionOption, database);

        const clientOptions: cassandra.ClientOptions = {
          contactPoints: rawClientOptions.contactPoints,
          keyspace: rawClientOptions.keyspace,
        };

        // client authentication
        if (rawClientOptions.authProvider) {
          clientOptions.authProvider = new cassandra.auth.PlainTextAuthProvider(
            rawClientOptions.authProvider.username,
            rawClientOptions.authProvider.password,
          );
        }

        try {
          // attempt #1: connect with SSL
          const client = new cassandra.Client({
            ...clientOptions,
            ...{
              sslOptions: {
                // for Cosmosdb (Cassandra API)
                // refer to this
                // https://docs.microsoft.com/en-us/azure/developer/javascript/how-to/with-database/use-cassandra-as-cosmos-db#use-native-sdk-packages-to-connect-to-cassandra-db-on-azure
                rejectUnauthorized: false,
              },
            },
          });
          await this.authenticateClient(client);
          this._connection = client;
          resolve(client);
        } catch (err1) {
          console.error("CassandraDataAdapter:authenticate attempt#1", err1);
          // attempt #2: connect without SSL
          const client = new cassandra.Client(clientOptions);
          await this.authenticateClient(client);
          this._connection = client;
          resolve(client);
        }
      } catch (err) {
        console.error("CassandraDataAdapter:getConnection", this.dialect, err);
        reject(err);
      }
    });
  }

  private async authenticateClient(client?: cassandra.Client) {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        client?.shutdown();
        reject("Connection Timeout");
      }, 15000);

      client?.connect((err: unknown) => {
        clearTimeout(timeout);
        if (err) {
          client?.shutdown();
          return reject(err);
        }

        this.version = client?.getState().getConnectedHosts()[0].cassandraVersion;
        this.isCassandra2 = this.version.indexOf("2.") === 0;

        resolve();
      });
    });
  }

  /** Shuts down the Cassandra client held by this adapter. */
  async disconnect() {
    try {
      await this._connection?.shutdown();
    } catch (err) {
      console.error("CassandraDataAdapter:disconnect", err);
    }
    this._connection = undefined;
  }

  /** Authenticates by establishing a Cassandra connection. */
  async authenticate() {
    await this.getConnection();
  }

  /**
   * Retrieves all keyspaces from the Cassandra cluster.
   * @returns Array of database (keyspace) metadata objects.
   */
  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const keyspaces = Object.keys(client?.metadata?.keyspaces);
    return keyspaces.map((keyspace) => ({
      name: keyspace,
      tables: [],
    }));
  }

  /**
   * Retrieves all tables in the specified keyspace.
   * @param database - The keyspace name.
   * @returns Array of table metadata objects.
   */
  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    if (!database) {
      return [];
    }

    let sql;
    if (this.isCassandra2 === true) {
      sql = `
          SELECT columnfamily_name as name
          FROM system.schema_columnfamilies
          WHERE keyspace_name = ?
        `;
    } else {
      sql = `
          SELECT table_name as name
          FROM system_schema.tables
          WHERE keyspace_name = ?
        `;
    }

    const res = await this._execute(sql, [database]);

    return res.rows.map((row) => ({
      name: row.name,
      columns: [],
    }));
  }

  /**
   * Retrieves column metadata for a table in the specified keyspace.
   * @param table - The table name.
   * @param database - The keyspace name.
   * @returns Array of column metadata objects.
   */
  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    if (!database) {
      return [];
    }

    let sql;
    if (this.isCassandra2 === true) {
      sql = `
        SELECT type as position, column_name as name, validator as type, type as kind
        FROM system.schema_columns
        WHERE keyspace_name = ?
          AND columnfamily_name = ?
      `;
    } else {
      sql = `
        SELECT position, column_name as name, type, kind
        FROM system_schema.columns
        WHERE keyspace_name = ?
          AND table_name = ?
      `;
    }
    const res = await this._execute(sql, [database, table]);

    return res.rows.map((row) => ({
      name: row.name,
      type: row.type,
      kind: row.kind,
    }));
  }

  private async _execute(sql: string, params?: string[], database?: string) {
    const client = await this.getConnection(database);
    return await client.execute(sql, params || [], { prepare: true });
  }

  /**
   * Executes a CQL query against the Cassandra cluster.
   * @param sql - The CQL query string to execute.
   * @param database - The keyspace to execute against.
   * @returns The query result with rows or error information.
   */
  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    let rawToUse: any | undefined;
    let metaToUse: any | undefined;

    try {
      const res = await this._execute(sql, undefined, database);

      if (!res) {
        return {
          ok: false,
          raw: [],
          meta: null,
        };
      }
      const { rows } = res;

      //@ts-ignore
      delete res.rows;

      rawToUse = rows;
      metaToUse = res;

      return {
        ok: true,
        raw: rawToUse,
        meta: metaToUse,
      };
    } catch (error) {
      console.error("CassandraDataAdapter:execute", error);
      return {
        ok: false,
        error,
      };
    }
  }
}
