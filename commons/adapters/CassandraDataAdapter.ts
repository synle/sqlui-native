import * as cassandra from 'cassandra-driver';
import { SqluiCore } from '../../typings';
import CoreDataAdapter from './CoreDataAdapter';

export default class CassandraAdapter implements CoreDataAdapter {
  connectionOption: string;
  dialect: SqluiCore.Dialect = 'cassandra';
  client?: cassandra.Client;
  private clients: Record<string, cassandra.Client> = {};
  /**
   * cassandra version
   * @type {number}
   */
  version?: string;
  isCassandra2?: boolean;

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;
  }

  private async getConnection(database?: string): Promise<cassandra.Client> {
    // attempt to pull in connections
    return new Promise<cassandra.Client>(async (resolve, reject) => {
      try {
        // TODO: hard coded now for testing...
        this.client = new cassandra.Client({
          contactPoints: ['127.0.0.1'],
          protocolOptions: {
            port: 9042,
          },
          keyspace: database,
        });

        // connection = new driver.Client({contactPoints: ['abc'], keyspace: 'system_schema'});

        await this.authenticate();

        resolve(this.client);
      } catch (err) {
        reject(err);
      }
    });
  }

  async authenticate() {
    // TODO: To Be Implemented
    return new Promise<void>((resolve, reject) => {
      this.client?.connect((err: unknown) => {
        if (err) {
          this.client?.shutdown();
          return reject(err);
        }

        this.version = this.client?.getState().getConnectedHosts()[0].cassandraVersion;
        this.isCassandra2 = this.version === '2';

        resolve();
      });
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const keyspaces = Object.keys(this.client?.metadata?.keyspaces);
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
    if (!database) {
      return client.execute(sql, params || [], { prepare: true });
    }
    return client.execute(sql, params || [], { prepare: true });
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    let rawToUse: any | undefined;
    let metaToUse: any | undefined;

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

    //
    // {
    //   info: {
    //     queriedHost: '127.0.0.1:9042',
    //     triedHosts: { '127.0.0.1:9042': null },
    //     speculativeExecutions: 0,
    //     achievedConsistency: 10,
    //     traceId: undefined,
    //     warnings: undefined,
    //     customPayload: undefined
    //   },
    //   rows: [
    //     Row { cluster_name: 'Test Cluster', listen_address: [InetAddress] }
    //   ],
    //   rowLength: 1,
    //   columns: [
    //     { name: 'cluster_name', type: [Object] },
    //     { name: 'listen_address', type: [Object] }
    //   ],
    //   pageState: null,
    //   nextPage: undefined
    // }

    return {
      ok: false,
      raw: rawToUse,
      meta: metaToUse,
    };
  }
}
