import * as cassandra from 'cassandra-driver';
import { SqluiCore } from '../../typings';
import IDataAdapter from './IDataAdapter';
import BaseDataAdapter from './BaseDataAdapter';

export default class CassandraAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'cassandra';
  /**
   * cassandra version
   * @type {number}
   */
  version?: string;
  isCassandra2?: boolean;

  constructor(connectionOption: string) {
    super(connectionOption);
    this.dialect = 'cassandra';
  }

  private async getConnection(database?: string): Promise<cassandra.Client> {
    // attempt to pull in connections
    return new Promise<cassandra.Client>(async (resolve, reject) => {
      try {
        const connectionParameters = BaseDataAdapter.getConnectionParameters(this.connectionOption);

        const connectionHosts = connectionParameters?.hosts || [];
        if(connectionHosts.length === 0){
          // we need a host in the connection string
          reject('Invalid connection. Host and Port not found');
        }

        //@ts-ignore
        const client = new cassandra.Client({
          contactPoints: [connectionHosts[0].host],
          protocolOptions: {
            port: connectionHosts[0].port,
          },
          keyspace: database,
        });

        await this.authenticate(client);

        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  }

  async authenticate(client?: cassandra.Client) {
    // TODO: To Be Implemented
    return new Promise<void>((resolve, reject) => {
      client?.connect((err: unknown) => {
        if (err) {
          client?.shutdown();
          return reject(err);
        }

        this.version = client?.getState().getConnectedHosts()[0].cassandraVersion;
        this.isCassandra2 = this.version === '2';

        resolve();
      });
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const keyspaces = Object.keys(client?.metadata?.keyspaces);
    return keyspaces
      .map((keyspace) => ({
        name: keyspace,
        tables: [],
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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

    return res.rows
      .map((row) => ({
        name: row.name,
        columns: [],
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    if (!database) {
      return [];
    }

    let sql;
    if (this.isCassandra2 === true) {
      sql = `
        SELECT type as position, column_name, validator as type
        FROM system.schema_columns
        WHERE keyspace_name = ?
          AND columnfamily_name = ?
      `;
    } else {
      sql = `
        SELECT position, column_name, type
        FROM system_schema.columns
        WHERE keyspace_name = ?
          AND table_name = ?
      `;
    }
    const res = await this._execute(sql, [database, table]);

    return res.rows
      .map((row) => ({
        name: row.column_name,
        type: row.type,
      }))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
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
