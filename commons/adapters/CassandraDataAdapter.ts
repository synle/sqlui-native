import * as cassandra from 'cassandra-driver';
import { SqluiCore } from '../../typings';
import CoreDataAdapter from './CoreDataAdapter';

export default class CassandraAdapter implements CoreDataAdapter {
  connectionOption: string;
  dialect: SqluiCore.Dialect = 'cassandra';
  client?: cassandra.Client;
  /**
   * cassandra version
   * @type {number}
   */
  // version: string;

  constructor(connectionOption: string) {
    this.connectionOption = connectionOption as string;

    try{
      // TODO: hard coded now for testing...
      this.client = new cassandra.Client({
        contactPoints: ['127.0.0.1'],
        protocolOptions: {
            port: 9042,
        }
        // keyspace: undefined
      });
    } catch(err){

    }


  }

  async authenticate() {
    // TODO: To Be Implemented
     return new Promise<void>((resolve, reject) => {
      this.client?.connect((err: unknown) => {
        if (err) {
          this.client?.shutdown();
          return reject(err);
        }

        console.log(this.client?.getState().getConnectedHosts());

        // this.version = {
        //   name: 'Cassandra',
        //   version: this.client?.getState().getConnectedHosts()[0].cassandraVersion,
        //   string: `Cassandra ${this.client?.getState().getConnectedHosts()[0].cassandraVersion}`,
        // };

        resolve();
      });
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    //@ts-ignore
    const keyspaces = Object.keys(this.client?.metadata?.keyspaces);
    return keyspaces.map(keyspace =>({
      name: keyspace,
      tables: []
    }));
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    // TODO: To Be Implemented
    console.log(this.version);

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

    const res = await this.client?.execute(sql);

    if(!res){
       return {
        ok: false,
        raw: [],
        meta: null,
      };
    }
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
    };
  }
}
