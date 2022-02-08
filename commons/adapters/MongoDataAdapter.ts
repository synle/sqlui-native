// mongodb://localhost:27017
import { MongoClient } from 'mongodb';
import { SqluiCore } from '../../typings';
import IDataAdapter from './IDataAdapter';
import BaseDataAdapter from './BaseDataAdapter';

export default class MongoDataAdapter extends BaseDataAdapter implements IDataAdapter {
  dialect: SqluiCore.Dialect = 'mongodb';

  constructor(connectionOption: string) {
    super(connectionOption);
  }

  private async getConnection(): Promise<MongoClient> {
    // attempt to pull in connections
    return new Promise<MongoClient>(async (resolve, reject) => {
      try {
        const client = new MongoClient(this.connectionOption);
        await client.connect();
        resolve(client);
      } catch (err) {
        reject(err);
      }
    });
  }

  async authenticate() {
    return new Promise<void>(async (resolve, reject) => {
      try {
        const client = new MongoClient(this.connectionOption);
        await client.connect();
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  async getDatabases(): Promise<SqluiCore.DatabaseMetaData[]> {
    const client = await this.getConnection();

    //@ts-ignore
    const res = await client.db().admin().listDatabases();
    return res.databases.map((database: any) => ({
      name: database.name,
      tables: [],
    }));
  }

  async getTables(database?: string): Promise<SqluiCore.TableMetaData[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await this.getConnection();

        //@ts-ignore
        const collections = await client.db(database).listCollections().toArray();

        resolve(
          (collections || []).map((collection) => ({
            name: collection.name,
            columns: [],
          })),
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  async getColumns(table: string, database?: string): Promise<SqluiCore.ColumnMetaData[]> {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await this.getConnection();

        //@ts-ignore
        const items = await client.db(database).collection(table).find().limit(5).toArray();

        const columnsMap: Record<string, SqluiCore.ColumnMetaData> = {};
        for (const item of items) {
          for (const key1 of Object.keys(item)) {
            let type1 = typeof item[key1];

            if (type1 === 'object' && key1 !== '_id') {
              // let's get to the second layer
              // TODO: ideally, we should do a DFS here and get all of the children
              for (const key2 of Object.keys(item[key1])) {
                let type2 = typeof item[key1][key2];

                const key = [key1, key2].join('.')

                columnsMap[key] = columnsMap[key1] || {
                  name: key,
                  type: type2,
                };
              }
            } else {
              columnsMap[key1] = columnsMap[key1] || {
                name: key1,
                type: type1,
              };
            }
          }
        }
        resolve(Object.values(columnsMap));
      } catch (err) {
        reject(err);
      }
    });
  }

  async execute(sql: string, database?: string): Promise<SqluiCore.Result> {
    return new Promise(async (resolve, reject) => {
      try {
        const client = await this.getConnection();

        const db = await client.db(database)

        //@ts-ignore
        const rawToUse : any[] =await eval(sql);

        resolve({
          ok: false,
          raw: rawToUse,
        })
      } catch (err) {
        console.log(err)
        resolve({
          ok: false,
          error: err
        })
      }
    });
  }
}
