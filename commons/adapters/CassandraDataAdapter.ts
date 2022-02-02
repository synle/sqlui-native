import * as cassandra from 'cassandra-driver';
import { SqluiCore } from '../../typings';
import CoreDataAdapter from './CoreDataAdapter';

export default class CassandraAdapter implements CoreDataAdapter {
  connectionOption: string;
  dialect: SqluiCore.Dialect = 'cassandra';
  client: cassandra.Client;

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;

    // TODO: hard coded now for testing...
    this.client = new cassandra.Client({
      contactPoints: ['127.0.0.1'],
      protocolOptions: {
          port: 9042,
      }
      // keyspace: undefined
    });
  }

  async authenticate() {
    // TODO: To Be Implemented
    // var authProvider = new cassandra.auth.PlainTextAuthProvider('Username', 'Password');
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    // TODO: To Be Implemented
    return [{
      name: 'cass-db',
      tables: []
    }];
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: To Be Implemented
    return [{
      name: 'cass-tbl1',
      columns: []
    }];
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    // TODO: To Be Implemented
    return [
      {"name":"cass-c1","type":"INT","allowNull":false,"defaultValue":'',"primaryKey":true,"autoIncrement":true,"comment":null},
      {"name":"cass-c2","type":"INT","allowNull":false,"defaultValue":'',"primaryKey":true,"autoIncrement":true,"comment":null},
      {"name":"cass-c3","type":"INT","allowNull":false,"defaultValue":'',"primaryKey":true,"autoIncrement":true,"comment":null},
    ];
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    let rawToUse: any | undefined ;
    let metaToUse: any | undefined;
    let affectedRows;

    const res = await this.client.execute(sql);

    const {rows} = res;

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
      affectedRows,
    };
  }
}
