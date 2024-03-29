import * as cassandra from 'cassandra-driver';
import BaseDataAdapter from 'src/common/adapters/BaseDataAdapter/index';
import { getClientOptions } from 'src/common/adapters/CassandraDataAdapter/utils';
import IDataAdapter from 'src/common/adapters/IDataAdapter';
import { SqluiCore } from 'typings';

export default class CassandraDataAdapter extends BaseDataAdapter implements IDataAdapter {
  /**
   * cassandra version
   * @type {number}
   */
  version?: string;
  isCassandra2?: boolean;

  constructor(connectionOption: string) {
    super(connectionOption);
  }

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
        let authProvider: cassandra.auth.PlainTextAuthProvider | undefined;
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
          resolve(client);
        } catch (err1) {
          // attempt #2: connect without SSL
          const client = new cassandra.Client(clientOptions);
          await this.authenticateClient(client);
          resolve(client);
        }
      } catch (err) {
        console.log('Failed to getConnection', this.dialect, err);
        reject(err);
      }
    });
  }

  private async authenticateClient(client?: cassandra.Client) {
    // TODO: To Be Implemented
    return new Promise<void>((resolve, reject) => {
      client?.connect((err: unknown) => {
        if (err) {
          client?.shutdown();
          return reject(err);
        }

        this.version = client?.getState().getConnectedHosts()[0].cassandraVersion;
        this.isCassandra2 = this.version.indexOf('2.') === 0;

        resolve();
      });
    });
  }

  async authenticate() {
    await this.getConnection();
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const keyspaces = Object.keys(client?.metadata?.keyspaces);
    return keyspaces.map((keyspace) => ({
      name: keyspace,
      tables: [],
    }));
  }

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
    try {
      let res = await client.execute(sql, params || [], { prepare: true });
      client?.shutdown();
      return res;
    } catch (err) {
      client?.shutdown();
      throw err;
    }
  }

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
      return {
        ok: false,
        error,
      };
    }
  }
}
