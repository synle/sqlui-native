import fs from 'fs';
import { SqluiCore, SqlAction } from 'typings';
import { formatJS } from 'src/utils/formatter';
import { formatSQL } from 'src/utils/formatter';
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
  let commandGuides: string[] = [`
---
title: sqlui-native query help?
---

Query Help?
===========
  `.trim()];

  function addGuideText(sectionName: string, scripts: (SqlAction.Output | undefined)[]) {
    commandGuides.push(`## ${sectionName}\n`);

    for (const script of scripts) {
      if (script && script.query) {
        commandGuides.push(`### ${script.label}\n`);

        let query = script.query
          .replace(/--/g, '\n')
          .replace(/\n/g, ' ')
          .replace(/[ ][ ]+/g, ' ')
          .trim();
        switch (script.formatter) {
          case 'sql':
            query = formatSQL(query);
            break;
          case 'js':
            query = formatJS(query);
            break;
        }

        commandGuides.push('```');
        commandGuides.push(query);
        commandGuides.push('```\n\n');
      }
    }
  }

  test('RmdbScripts - mysql', async () => {
    const scripts = _getScript(RmdbScripts, 'mysql');
    expect(scripts).toMatchSnapshot();
    addGuideText('mysql', scripts);
  });

  test('RmdbScripts - mariadb', async () => {
    const scripts = _getScript(RmdbScripts, 'mariadb');
    expect(scripts).toMatchSnapshot();
    addGuideText('mariadb', scripts);
  });

  test('RmdbScripts - mssql', async () => {
    const scripts = _getScript(RmdbScripts, 'mssql');
    expect(scripts).toMatchSnapshot();
    addGuideText('mssql', scripts);
  });

  test('RmdbScripts - postgres', async () => {
    const scripts = _getScript(RmdbScripts, 'postgres');
    expect(scripts).toMatchSnapshot();
    addGuideText('postgres', scripts);
  });

  test('RmdbScripts - sqlite', async () => {
    const scripts = _getScript(RmdbScripts, 'sqlite');
    expect(scripts).toMatchSnapshot();
    addGuideText('sqlite', scripts);
  });

  test('CassandraScripts', async () => {
    const scripts = _getScript(CassandraScripts, 'cassandra');
    expect(scripts).toMatchSnapshot();
    addGuideText('cassandra', scripts);
  });

  test('MongodbScripts', async () => {
    const scripts = _getScript(MongodbScripts, 'mongodb');
    expect(scripts).toMatchSnapshot();
    addGuideText('mongodb', scripts);
  });

  test('RedisScripts', async () => {
    const scripts = _getScript(RedisScripts, 'redis');
    expect(scripts).toMatchSnapshot();
    addGuideText('redis', scripts);
  });

  test('Consolidate the guide into a command', async () => {
    const newGuide = commandGuides.join('\n');
    fs.writeFileSync('./guides.md', newGuide);
  });
});
