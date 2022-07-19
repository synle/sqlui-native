import fs from 'fs';
import {
  getDatabaseActions,
  getSampleConnectionString,
  getTableActions,
} from 'src/common/adapters/DataScriptFactory';
import { SqlAction, SqluiCore } from 'typings';

type GuideMetaData = {
  connectionString?: string;
  scripts?: SqlAction.Output[];
};

function _getScript(dialect: SqluiCore.Dialect): GuideMetaData {
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

  const sampleConnectionString = getSampleConnectionString(dialect);

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

  return {
    connectionString: sampleConnectionString,
    scripts: [...databaseActionScripts, ...tableActionScripts],
  };
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

  function addGuideText(
    sectionName: string,
    connectionString: string | undefined,
    scripts: SqlAction.Output[] | undefined,
  ) {
    commandGuides.push(`## ${sectionName}\n`);

    if (connectionString) {
      commandGuides.push(`### Sample Connection String\n`);

      commandGuides.push(`This is a sample connection string you can use.`);

      commandGuides.push('```');
      commandGuides.push(connectionString);
      commandGuides.push('```\n\n');
    }

    if (scripts) {
      for (const script of scripts) {
        if (script && script.query) {
          commandGuides.push(`### ${script.label}\n`);

          commandGuides.push('```' + script.formatter);
          commandGuides.push(script.query);
          commandGuides.push('```\n\n');
        }
      }
    }
  }

  test('RDBMS - mysql', async () => {
    const { connectionString, scripts } = _getScript('mysql');
    expect(scripts).toMatchSnapshot();
    addGuideText('mysql', connectionString, scripts);
  });

  test('RDBMS - mariadb', async () => {
    const { connectionString, scripts } = _getScript('mariadb');
    expect(scripts).toMatchSnapshot();
    addGuideText('mariadb', connectionString, scripts);
  });

  test('RDBMS - mssql', async () => {
    const { connectionString, scripts } = _getScript('mssql');
    expect(scripts).toMatchSnapshot();
    addGuideText('mssql', connectionString, scripts);
  });

  test('RDBMS - postgres', async () => {
    const { connectionString, scripts } = _getScript('postgres');
    expect(scripts).toMatchSnapshot();
    addGuideText('postgres', connectionString, scripts);
  });

  test('RDBMS - sqlite', async () => {
    const { connectionString, scripts } = _getScript('sqlite');
    expect(scripts).toMatchSnapshot();
    addGuideText('sqlite', connectionString, scripts);
  });

  test('cassandra', async () => {
    const { connectionString, scripts } = _getScript('cassandra');
    expect(scripts).toMatchSnapshot();
    addGuideText('cassandra', connectionString, scripts);
  });

  test('mongodb', async () => {
    const { connectionString, scripts } = _getScript('mongodb');
    expect(scripts).toMatchSnapshot();
    addGuideText('mongodb', connectionString, scripts);
  });

  test('redis', async () => {
    const { connectionString, scripts } = _getScript('redis');
    expect(scripts).toMatchSnapshot();
    addGuideText('redis', connectionString, scripts);
  });

  test('cosmosdb', async () => {
    const { connectionString, scripts } = _getScript('cosmosdb');
    expect(scripts).toMatchSnapshot();
    addGuideText('cosmosdb', connectionString, scripts);
  });

  test('aztable', async () => {
    const { connectionString, scripts } = _getScript('aztable');
    expect(scripts).toMatchSnapshot();
    addGuideText('aztable', connectionString, scripts);
  });

  test('Consolidate the guide into a command', async () => {
    const newGuide = commandGuides.join('\n');
    fs.writeFileSync('./guides.md', newGuide);
  });
});
