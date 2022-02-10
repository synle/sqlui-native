import { SqluiCore, SqlAction } from 'typings';
import { scripts as RmdbScripts } from 'src/scripts/rmdb';
import { scripts as CassandraScripts } from 'src/scripts/cassandra';
import { scripts as MongodbScripts } from 'src/scripts/mongodb';
import { scripts as RedisScripts } from 'src/scripts/redis';

function _getScript(scripts: SqlAction.ScriptGenerator[], dialect: SqluiCore.Dialect) {
  return scripts
    .map((fn) => {
      return fn({
        dialect,
        connectionId: 'connection1',
        databaseId: 'database1',
        querySize: 200,
        tableId: 'table1',
        columns: [
          {
            name: 'column1',
            type: 'NUMBER',
          },
          {
            name: 'column2',
            type: 'VARCHAR(100)',
          },
        ],
      });
    })
    .filter((script) => script);
}

describe('Scripts', () => {
  test('RmdbScripts - mysql', async () => {
    const scripts = _getScript(RmdbScripts, 'mysql');
    expect(scripts).toMatchSnapshot();
  });
  test('RmdbScripts - mariadb', async () => {
    const scripts = _getScript(RmdbScripts, 'mariadb');
    expect(scripts).toMatchSnapshot();
  });
  test('RmdbScripts - mssql', async () => {
    const scripts = _getScript(RmdbScripts, 'mssql');
    expect(scripts).toMatchSnapshot();
  });
  test('RmdbScripts - postgres', async () => {
    const scripts = _getScript(RmdbScripts, 'postgres');
    expect(scripts).toMatchSnapshot();
  });
  test('RmdbScripts - sqlite', async () => {
    const scripts = _getScript(RmdbScripts, 'sqlite');
    expect(scripts).toMatchSnapshot();
  });

  test('CassandraScripts', async () => {
    const scripts = _getScript(CassandraScripts, 'cassandra');
    expect(scripts).toMatchSnapshot();
  });

  test('MongodbScripts', async () => {
    const scripts = _getScript(MongodbScripts, 'mongodb');
    expect(scripts).toMatchSnapshot();
  });

  test('RedisScripts', async () => {
    const scripts = _getScript(RedisScripts, 'redis');
    expect(scripts).toMatchSnapshot();
  });
});
