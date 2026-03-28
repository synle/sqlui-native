import fs from "node:fs";
import {
  getCodeSnippet,
  getConnectionActions,
  getConnectionSetupGuide,
  getDatabaseActions,
  getSampleConnectionString,
  getTableActions,
} from "src/common/adapters/DataScriptFactory";
import { SqlAction, SqluiCore } from "typings";

type GuideMetaData = {
  connectionString?: string;
  scripts?: SqlAction.Output[];
};

function _getScript(dialect: SqluiCore.Dialect): GuideMetaData {
  const connectionId = "connection1";
  const databaseId = "database1";
  const tableId = "table1";
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
        name: "id",
        type: "INT",
        primaryKey: true,
      },
      {
        name: "column1",
        type: "INT",
      },
      {
        name: "column2",
        type: "VARCHAR(100)",
      },
    ],
  });

  const databaseActionScripts = getDatabaseActions({
    ...baseInputs,
  });

  return {
    connectionString: sampleConnectionString,
    scripts: [...databaseActionScripts, ...tableActionScripts].filter((script) => !script.skipGuide),
  };
}

describe("Scripts", () => {
  let commandGuides: string[] = [
    `
---
title: sqlui-native
---

Query Guides:
=============
  `.trim(),
  ];

  function addGuideText(sectionName: string, connectionString: string | undefined, scripts: SqlAction.Output[] | undefined) {
    commandGuides.push(`## ${sectionName}\n`);

    if (connectionString) {
      commandGuides.push(`### Sample Connection String\n`);

      commandGuides.push(`This is a sample connection string you can use.`);

      commandGuides.push("```");
      commandGuides.push(connectionString);
      commandGuides.push("```\n\n");
    }

    if (scripts) {
      for (const script of scripts) {
        if (script && script.query) {
          commandGuides.push(`### ${script.label}\n`);

          commandGuides.push("```" + script.formatter);
          commandGuides.push(script.query);
          commandGuides.push("```\n\n");
        }
      }
    }
  }

  test("RDBMS - mysql", async () => {
    const { connectionString, scripts } = _getScript("mysql");
    expect(scripts).toMatchSnapshot();
    addGuideText("mysql", connectionString, scripts);
  });

  test("RDBMS - mariadb", async () => {
    const { connectionString, scripts } = _getScript("mariadb");
    expect(scripts).toMatchSnapshot();
    addGuideText("mariadb", connectionString, scripts);
  });

  test("RDBMS - mssql", async () => {
    const { connectionString, scripts } = _getScript("mssql");
    expect(scripts).toMatchSnapshot();
    addGuideText("mssql", connectionString, scripts);
  });

  test("RDBMS - postgres", async () => {
    const { connectionString, scripts } = _getScript("postgres");
    expect(scripts).toMatchSnapshot();
    addGuideText("postgres", connectionString, scripts);
  });

  test("RDBMS - sqlite", async () => {
    const { connectionString, scripts } = _getScript("sqlite");
    expect(scripts).toMatchSnapshot();
    addGuideText("sqlite", connectionString, scripts);
  });

  test("cassandra", async () => {
    const { connectionString, scripts } = _getScript("cassandra");
    expect(scripts).toMatchSnapshot();
    addGuideText("cassandra", connectionString, scripts);
  });

  test("mongodb", async () => {
    const { connectionString, scripts } = _getScript("mongodb");
    expect(scripts).toMatchSnapshot();
    addGuideText("mongodb", connectionString, scripts);
  });

  test("redis", async () => {
    const { connectionString, scripts } = _getScript("redis");
    expect(scripts).toMatchSnapshot();
    addGuideText("redis", connectionString, scripts);
  });

  test("cosmosdb", async () => {
    const { connectionString, scripts } = _getScript("cosmosdb");
    expect(scripts).toMatchSnapshot();
    addGuideText("cosmosdb", connectionString, scripts);
  });

  test("aztable", async () => {
    const { connectionString, scripts } = _getScript("aztable");
    expect(scripts).toMatchSnapshot();
    addGuideText("aztable", connectionString, scripts);
  });

  test("sfdc", async () => {
    const { connectionString, scripts } = _getScript("sfdc");
    expect(scripts).toMatchSnapshot();
    addGuideText("sfdc", connectionString, scripts);
  });

  // Connection actions tests
  const connectionDialects: SqluiCore.Dialect[] = [
    "mysql",
    "mariadb",
    "mssql",
    "postgres",
    "sqlite",
    "cassandra",
    "mongodb",
    "redis",
    "cosmosdb",
    "aztable",
    "sfdc",
  ];

  for (const dialect of connectionDialects) {
    test(`Connection actions - ${dialect}`, () => {
      const actions = getConnectionActions({
        dialect,
        connectionId: "connection1",
      });
      expect(Array.isArray(actions)).toBe(true);
    });
  }

  // Connection setup guide tests
  for (const dialect of connectionDialects) {
    test(`Connection setup guide - ${dialect}`, () => {
      const guide = getConnectionSetupGuide(dialect);
      expect(typeof guide).toBe("string");
    });
  }

  // Code snippet tests
  const codeSnippetLanguages: SqluiCore.LanguageMode[] = ["javascript", "python", "java"];
  const snippetDialects: Array<{ dialect: SqluiCore.Dialect; connection: string }> = [
    { dialect: "mysql", connection: "mysql://root:pass@localhost:3306" },
    { dialect: "postgres", connection: "postgres://user:pass@localhost:5432" },
    { dialect: "mssql", connection: "mssql://sa:pass@localhost:1433" },
    { dialect: "sqlite", connection: "sqlite://test.db" },
    { dialect: "mariadb", connection: "mariadb://root:pass@localhost:3306" },
    { dialect: "cassandra", connection: "cassandra://user:pass@localhost:9042" },
    { dialect: "mongodb", connection: "mongodb://localhost:27017" },
    { dialect: "redis", connection: "redis://localhost:6379" },
    { dialect: "cosmosdb", connection: "cosmosdb://AccountEndpoint=https://host:443;AccountKey=key" },
    {
      dialect: "aztable",
      connection: "aztable://DefaultEndpointsProtocol=https;AccountName=acct;AccountKey=key;EndpointSuffix=core.windows.net",
    },
    { dialect: "sfdc", connection: 'sfdc://{"username":"u","password":"p","securityToken":"t","loginUrl":"https://login.salesforce.com"}' },
  ];

  for (const { dialect, connection } of snippetDialects) {
    for (const language of codeSnippetLanguages) {
      test(`Code snippet - ${dialect} / ${language}`, () => {
        const snippet = getCodeSnippet(
          { dialect, connection, id: "c1", name: "Test" } as any,
          { sql: "SELECT 1", databaseId: "db1", tableId: "t1" } as any,
          language,
        );
        expect(typeof snippet).toBe("string");
      });
    }
  }

  test("Consolidate the guide into a command", async () => {
    const header =
      "<!-- Auto-generated by src/common/adapters/DataScriptFactory.spec.ts > Consolidate the guide into a command. Do not edit manually. -->";
    const newGuide = header + "\n\n" + commandGuides.join("\n").trim() + "\n";
    fs.writeFileSync("./guides.md", newGuide);
  });
});
