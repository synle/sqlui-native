import fs from 'fs';
import { getDatabaseActions, getTableActions } from 'src/frontend/data/sql';
import { SqlAction, SqluiCore } from 'typings';
function _getScript(dialect: SqluiCore.Dialect) {
  const connectionId = 'connection1';
  const databaseId = 'database1';
  const tableId = 'table1';
  const querySize = 200;

  const baseInputs = {
    dialect,
    connectionId,
    databaseId,
    querySize,
  };

  const tableActionScripts = getTableActions({
    ...baseInputs,
    tableId,
    columns: [
      {
        name: 'id',
        type: 'INT',
        primaryKey: true,
      },
      {
        name: 'column1',
        type: 'INT',
      },
      {
        name: 'column2',
        type: 'VARCHAR(100)',
      },
    ],
  });

  const databaseActionScripts = getDatabaseActions({
    ...baseInputs,
  });

  return [...databaseActionScripts, ...tableActionScripts];
}

describe('Scripts', () => {
  let commandGuides: string[] = [
    `
---
title: sqlui-native
---

Query Guides:
=============
  `.trim(),
  ];

  function addGuideText(sectionName: string, scripts: (SqlAction.Output | undefined)[]) {
    commandGuides.push(`## ${sectionName}\n`);

    for (const script of scripts) {
      if (script && script.query) {
        commandGuides.push(`### ${script.label}\n`);

        commandGuides.push('```' + script.formatter);
        commandGuides.push(script.query);
        commandGuides.push('```\n\n');
      }
    }
  }

  test('RmdbScripts - mysql', async () => {
    const scripts = _getScript('mysql');
    expect(scripts).toMatchSnapshot();
    addGuideText('mysql', scripts);
  });

  test('RmdbScripts - mariadb', async () => {
    const scripts = _getScript('mariadb');
    expect(scripts).toMatchSnapshot();
    addGuideText('mariadb', scripts);
  });

  test('RmdbScripts - mssql', async () => {
    const scripts = _getScript('mssql');
    expect(scripts).toMatchSnapshot();
    addGuideText('mssql', scripts);
  });

  test('RmdbScripts - postgres', async () => {
    const scripts = _getScript('postgres');
    expect(scripts).toMatchSnapshot();
    addGuideText('postgres', scripts);
  });

  test('RmdbScripts - sqlite', async () => {
    const scripts = _getScript('sqlite');
    expect(scripts).toMatchSnapshot();
    addGuideText('sqlite', scripts);
  });

  test('CassandraScripts', async () => {
    const scripts = _getScript('cassandra');
    expect(scripts).toMatchSnapshot();
    addGuideText('cassandra', scripts);
  });

  test('MongodbScripts', async () => {
    const scripts = _getScript('mongodb');
    expect(scripts).toMatchSnapshot();
    addGuideText('mongodb', scripts);
  });

  test('RedisScripts', async () => {
    const scripts = _getScript('redis');
    expect(scripts).toMatchSnapshot();
    addGuideText('redis', scripts);
  });

  test('Consolidate the guide into a command', async () => {
    const newGuide = commandGuides.join('\n');
    fs.writeFileSync('./guides.md', newGuide);
  });
});