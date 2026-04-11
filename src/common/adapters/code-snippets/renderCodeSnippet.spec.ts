import { describe, it, expect } from "vitest";
import { renderCodeSnippet } from "src/common/adapters/code-snippets/renderCodeSnippet";

describe("renderCodeSnippet", () => {
  // ─── JavaScript templates ───────────────────────────────────────────

  describe("javascript", () => {
    it("renders mysql template with connectionString and sql", () => {
      const result = renderCodeSnippet("javascript", "mysql", {
        connectionString: "mysql://root:pass@localhost:3306/mydb",
        sql: "SELECT * FROM users",
      });

      expect(result).toContain("require('mysql2/promise')");
      expect(result).toContain("mysql://root:pass@localhost:3306/mydb");
      expect(result).toContain("SELECT * FROM users");
    });

    it("renders postgres template with connectionString and sql", () => {
      const result = renderCodeSnippet("javascript", "postgres", {
        connectionString: "postgres://user:pass@localhost:5432/mydb",
        sql: "SELECT * FROM users",
      });

      expect(result).toContain("require('pg')");
      expect(result).toContain("postgres://user:pass@localhost:5432/mydb");
      expect(result).toContain("SELECT * FROM users");
    });

    it("renders sqlite template with storagePath and sql", () => {
      const result = renderCodeSnippet("javascript", "sqlite", {
        storagePath: "test-db.sqlite",
        sql: "SELECT * FROM users",
      });

      expect(result).toContain("require('better-sqlite3')");
      expect(result).toContain("test-db.sqlite");
      expect(result).toContain("SELECT * FROM users");
    });

    it("renders mssql template with connection params and sql", () => {
      const result = renderCodeSnippet("javascript", "mssql", {
        host: "localhost",
        port: 1433,
        username: "sa",
        password: "password123!",
        database: "mydb",
        sql: "SELECT * FROM users",
      });

      expect(result).toContain("require('tedious')");
      expect(result).toContain("'localhost'");
      expect(result).toContain("SELECT * FROM users");
    });

    it("renders cassandra template with clientOptionsJson and sql", () => {
      const result = renderCodeSnippet("javascript", "cassandra", {
        clientOptionsJson: '{"contactPoints":["localhost"],"keyspace":"mykeyspace"}',
        sql: "SELECT * FROM mytable",
      });

      expect(result).toContain("require('cassandra-driver')");
      expect(result).toContain('{"contactPoints":["localhost"],"keyspace":"mykeyspace"}');
      expect(result).toContain("SELECT * FROM mytable");
    });

    it("renders mongodb template with connectionString, database, and sql", () => {
      const result = renderCodeSnippet("javascript", "mongodb", {
        connectionString: "mongodb://localhost:27017",
        database: "testdb",
        sql: "db.collection('users').find()",
      });

      expect(result).toContain("require('mongodb')");
      expect(result).toContain("mongodb://localhost:27017");
      expect(result).toContain("'testdb'");
      expect(result).toContain("db.collection('users').find()");
    });

    it("renders redis template with clientOptionsJson and sql", () => {
      const result = renderCodeSnippet("javascript", "redis", {
        clientOptionsJson: '{ url: "redis://localhost:6379" }',
        sql: 'db.get("mykey")',
      });

      expect(result).toContain("require('redis')");
      expect(result).toContain('{ url: "redis://localhost:6379" }');
      expect(result).toContain('db.get("mykey")');
    });

    it("renders cosmosdb template with connectionString and sql", () => {
      const result = renderCodeSnippet("javascript", "cosmosdb", {
        connectionString: "AccountEndpoint=https://myaccount.documents.azure.com;AccountKey=abc123",
        sql: 'client.database("mydb").container("mycol").items.readAll().fetchAll()',
      });

      expect(result).toContain("require('@azure/cosmos')");
      expect(result).toContain("AccountEndpoint=https://myaccount.documents.azure.com;AccountKey=abc123");
      expect(result).toContain('client.database("mydb").container("mycol").items.readAll().fetchAll()');
    });

    it("renders sfdc template with sql", () => {
      const result = renderCodeSnippet("javascript", "sfdc", {
        sql: "SELECT Id, Name FROM Account",
      });

      expect(result).toContain("require('jsforce')");
      expect(result).toContain("SELECT Id, Name FROM Account");
      expect(result).toContain("conn.query");
    });

    it("renders aztable template with connectionString, tableId, and sql", () => {
      const result = renderCodeSnippet("javascript", "aztable", {
        connectionString: "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xyz",
        tableId: "MyTable",
        sql: "tableClient.listEntities()",
      });

      expect(result).toContain("require('@azure/data-tables')");
      expect(result).toContain("DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xyz");
      expect(result).toContain("'MyTable'");
      expect(result).toContain("tableClient.listEntities()");
    });
  });

  // ─── Python templates ───────────────────────────────────────────────

  describe("python", () => {
    it("renders mysql template with connection params and sql", () => {
      const result = renderCodeSnippet("python", "mysql", {
        host: "localhost",
        port: 3306,
        username: "root",
        password: "pass",
        database: "mydb",
        sql: "SELECT * FROM orders",
      });

      expect(result).toContain("import pymysql");
      expect(result).toContain("host='localhost'");
      expect(result).toContain("SELECT * FROM orders");
    });

    it("renders postgres template with connectionString and sql", () => {
      const result = renderCodeSnippet("python", "postgres", {
        connectionString: "postgresql://user:pass@localhost:5432/mydb",
        sql: "SELECT * FROM orders",
      });

      expect(result).toContain("import psycopg2");
      expect(result).toContain("postgresql://user:pass@localhost:5432/mydb");
      expect(result).toContain("SELECT * FROM orders");
    });

    it("renders sqlite template with storagePath and sql", () => {
      const result = renderCodeSnippet("python", "sqlite", {
        storagePath: "test-db.sqlite",
        sql: "SELECT * FROM orders",
      });

      expect(result).toContain("import sqlite3");
      expect(result).toContain("test-db.sqlite");
      expect(result).toContain("SELECT * FROM orders");
    });

    it("renders mssql template with connection params and sql", () => {
      const result = renderCodeSnippet("python", "mssql", {
        host: "localhost",
        port: 1433,
        username: "sa",
        password: "pass",
        database: "mydb",
        sql: "SELECT * FROM orders",
      });

      expect(result).toContain("import pymssql");
      expect(result).toContain("server='localhost'");
      expect(result).toContain("SELECT * FROM orders");
    });

    it("renders cassandra template with host, port, username, password, keyspace, and sql", () => {
      const result = renderCodeSnippet("python", "cassandra", {
        host: "127.0.0.1",
        port: "9042",
        username: "cassUser",
        password: "cassPass",
        keyspace: "mykeyspace",
        sql: "SELECT * FROM mytable",
      });

      expect(result).toContain("from cassandra.cluster import Cluster");
      expect(result).toContain("Cluster(['127.0.0.1'], port=9042");
      expect(result).toContain("username='cassUser'");
      expect(result).toContain("password='cassPass'");
      expect(result).toContain("session.execute('USE mykeyspace')");
      expect(result).toContain("SELECT * FROM mytable");
    });

    it("renders mongodb template with connectionString, database, and pythonSql", () => {
      const result = renderCodeSnippet("python", "mongodb", {
        connectionString: "mongodb://localhost:27017",
        database: "testdb",
        pythonSql: "db['users'].find().limit(10)",
      });

      expect(result).toContain("from pymongo import MongoClient");
      expect(result).toContain("mongodb://localhost:27017");
      expect(result).toContain("'testdb'");
      expect(result).toContain("db['users'].find().limit(10)");
    });

    it("renders redis template with url, passwordArg, and pythonCommand", () => {
      const result = renderCodeSnippet("python", "redis", {
        url: "redis://localhost:6379",
        passwordArg: ", password='secret'",
        pythonCommand: "get('mykey')",
      });

      expect(result).toContain("import redis");
      expect(result).toContain("redis://localhost:6379");
      expect(result).toContain(", password='secret'");
      expect(result).toContain("client.get('mykey')");
    });

    it("renders redis template without password", () => {
      const result = renderCodeSnippet("python", "redis", {
        url: "redis://localhost:6379",
        passwordArg: "",
        pythonCommand: "get('mykey')",
      });

      expect(result).toContain("redis.Redis.from_url('redis://localhost:6379')");
      expect(result).not.toContain("password");
    });

    it("renders cosmosdb template with connectionString, databaseId, and tableId", () => {
      const result = renderCodeSnippet("python", "cosmosdb", {
        connectionString: "AccountEndpoint=https://myaccount.documents.azure.com;AccountKey=abc",
        databaseId: "mydb",
        tableId: "mycol",
      });

      expect(result).toContain("from azure.cosmos import CosmosClient");
      expect(result).toContain("AccountEndpoint=https://myaccount.documents.azure.com;AccountKey=abc");
      expect(result).toContain("client.get_database_client('mydb')");
      expect(result).toContain("database.get_container_client('mycol')");
    });

    it("renders sfdc template with sql", () => {
      const result = renderCodeSnippet("python", "sfdc", {
        sql: "SELECT Id, Name FROM Account",
      });

      expect(result).toContain("from simple_salesforce import Salesforce");
      expect(result).toContain("sf.query('SELECT Id, Name FROM Account')");
    });

    it("renders aztable template with connectionString and tableId", () => {
      const result = renderCodeSnippet("python", "aztable", {
        connectionString: "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xyz",
        tableId: "MyTable",
      });

      expect(result).toContain("from azure.data.tables import TableServiceClient, TableClient");
      expect(result).toContain("DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xyz");
      expect(result).toContain("'MyTable'");
    });
  });

  // ─── Java templates ─────────────────────────────────────────────────

  describe("java", () => {
    it("renders mysql template with jdbcUrl and escapedSql", () => {
      const result = renderCodeSnippet("java", "mysql", {
        jdbcUrl: "jdbc:mysql://localhost:3306/mydb",
        escapedSql: "SELECT * FROM users",
      });

      expect(result).toContain("import java.sql.*");
      expect(result).toContain("jdbc:mysql://localhost:3306/mydb");
      expect(result).toContain("SELECT * FROM users");
      expect(result).toContain("DriverManager.getConnection(DB_URL)");
    });

    it("renders postgres template with jdbcUrl and escapedSql", () => {
      const result = renderCodeSnippet("java", "postgres", {
        jdbcUrl: "jdbc:postgresql://localhost:5432/mydb",
        escapedSql: "SELECT * FROM users",
      });

      expect(result).toContain("import java.sql.*");
      expect(result).toContain("jdbc:postgresql://localhost:5432/mydb");
    });

    it("renders sqlite template with jdbcUrl and escapedSql", () => {
      const result = renderCodeSnippet("java", "sqlite", {
        jdbcUrl: "jdbc:sqlite:test-db.sqlite",
        escapedSql: "SELECT * FROM users",
      });

      expect(result).toContain("import java.sql.*");
      expect(result).toContain("jdbc:sqlite:test-db.sqlite");
    });

    it("renders mssql template with jdbcUrl and escapedSql", () => {
      const result = renderCodeSnippet("java", "mssql", {
        jdbcUrl: "jdbc:sqlserver://localhost:1433",
        escapedSql: "SELECT * FROM users",
      });

      expect(result).toContain("import java.sql.*");
      expect(result).toContain("jdbc:sqlserver://localhost:1433");
    });

    it("renders cassandra template with host, port, authCredentialsLine, keyspace, and escapedSql", () => {
      const result = renderCodeSnippet("java", "cassandra", {
        host: "127.0.0.1",
        port: "9042",
        authCredentialsLine: '.withAuthCredentials("cassUser", "cassPass")',
        keyspace: "mykeyspace",
        escapedSql: "SELECT * FROM mytable",
      });

      expect(result).toContain("CqlSession");
      expect(result).toContain('new InetSocketAddress("127.0.0.1", 9042)');
      expect(result).toContain('.withAuthCredentials("cassUser", "cassPass")');
      expect(result).toContain('.withKeyspace("mykeyspace")');
      expect(result).toContain("SELECT * FROM mytable");
    });

    it("renders mongodb template with connectionString and database", () => {
      const result = renderCodeSnippet("java", "mongodb", {
        connectionString: "mongodb://localhost:27017",
        database: "testdb",
      });

      expect(result).toContain('MongoClients.create("mongodb://localhost:27017")');
      expect(result).toContain('client.getDatabase("testdb")');
    });

    it("renders redis template with url and authLine", () => {
      const result = renderCodeSnippet("java", "redis", {
        url: "redis://localhost:6379",
        authLine: 'jedis.auth("password");',
      });

      expect(result).toContain("import redis.clients.jedis.Jedis");
      expect(result).toContain('new Jedis("redis://localhost:6379")');
      expect(result).toContain('jedis.auth("password");');
    });

    it("renders cosmosdb template with connectionString, databaseId, and tableId", () => {
      const result = renderCodeSnippet("java", "cosmosdb", {
        connectionString: "AccountEndpoint=https://myaccount.documents.azure.com;AccountKey=abc",
        databaseId: "mydb",
        tableId: "mycol",
      });

      expect(result).toContain("import com.azure.cosmos.CosmosClient");
      expect(result).toContain("AccountEndpoint=https://myaccount.documents.azure.com;AccountKey=abc");
      expect(result).toContain('client.getDatabase("mydb")');
      expect(result).toContain('database.getContainer("mycol")');
    });

    it("renders sfdc template with sql", () => {
      const result = renderCodeSnippet("java", "sfdc", {
        sql: "SELECT Id, Name FROM Account",
      });

      expect(result).toContain("import java.net.URI");
      expect(result).toContain("import java.net.http.HttpClient");
      expect(result).toContain("SELECT Id, Name FROM Account");
    });

    it("renders aztable template with connectionString and tableId", () => {
      const result = renderCodeSnippet("java", "aztable", {
        connectionString: "DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xyz",
        tableId: "MyTable",
      });

      expect(result).toContain("import com.azure.data.tables.TableClient");
      expect(result).toContain("DefaultEndpointsProtocol=https;AccountName=myaccount;AccountKey=xyz");
      expect(result).toContain('"MyTable"');
    });
  });

  // ─── Java with Gradle wrapper ───────────────────────────────────────

  describe("java with javaGradleOptions", () => {
    it("wraps Java output in Gradle project structure", () => {
      const result = renderCodeSnippet(
        "java",
        "mysql",
        {
          jdbcUrl: "jdbc:mysql://localhost:3306/mydb",
          escapedSql: "SELECT 1",
        },
        {
          gradleDep: "    implementation 'mysql:mysql-connector-java:8.0.33'",
          mainJavaComment: "// Main.java",
        },
      );

      expect(result).toContain("build.gradle");
      expect(result).toContain("INSTRUCTIONS");
      expect(result).toContain("plugins {");
      expect(result).toContain("id 'application'");
      expect(result).toContain("repositories {");
      expect(result).toContain("mavenCentral()");
      expect(result).toContain("dependencies {");
      expect(result).toContain("implementation 'mysql:mysql-connector-java:8.0.33'");
      expect(result).toContain("mainClass = 'Main'");
      expect(result).toContain("// Main.java");
      expect(result).toContain("import java.sql.*");
      expect(result).toContain("jdbc:mysql://localhost:3306/mydb");
    });

    it("includes connectDescription in the Gradle header when provided", () => {
      const result = renderCodeSnippet(
        "java",
        "mysql",
        {
          jdbcUrl: "jdbc:mysql://localhost:3306/mydb",
          escapedSql: "SELECT 1",
        },
        {
          connectDescription: "MySQL at localhost:3306",
          gradleDep: "    implementation 'mysql:mysql-connector-java:8.0.33'",
          mainJavaComment: "// Main.java",
        },
      );

      expect(result).toContain("Connect to MySQL at localhost:3306");
      expect(result).toContain("Run your query against the database");
    });

    it("omits connectDescription section when not provided", () => {
      const result = renderCodeSnippet(
        "java",
        "mysql",
        {
          jdbcUrl: "jdbc:mysql://localhost:3306/mydb",
          escapedSql: "SELECT 1",
        },
        {
          gradleDep: "    implementation 'mysql:mysql-connector-java:8.0.33'",
          mainJavaComment: "// Main.java",
        },
      );

      expect(result).not.toContain("This will:");
      expect(result).not.toContain("Connect to");
    });

    it("wraps cassandra Java template in Gradle structure", () => {
      const result = renderCodeSnippet(
        "java",
        "cassandra",
        {
          host: "127.0.0.1",
          port: "9042",
          authCredentialsLine: "",
          keyspace: "ks1",
          escapedSql: "SELECT * FROM t",
        },
        {
          gradleDep: "    implementation 'com.datastax.oss:java-driver-core:4.17.0'",
          mainJavaComment: "// Main.java - Cassandra",
        },
      );

      expect(result).toContain("build.gradle");
      expect(result).toContain("java-driver-core");
      expect(result).toContain("CqlSession");
    });
  });

  // ─── REST API templates ─────────────────────────────────────────────

  describe("rest", () => {
    const restContext = {
      url: "https://api.example.com/users",
      method: "GET",
      methodLower: "get",
      headers: { Accept: "application/json" },
      headersJson: JSON.stringify({ Accept: "application/json" }, null, 2),
      headerLines: [{ key: "Accept", value: "application/json" }],
    };

    it("renders javascript rest template with url, method, and headers", () => {
      const result = renderCodeSnippet("javascript", "rest" as any, restContext);

      expect(result).toContain("fetch(");
      expect(result).toContain("https://api.example.com/users");
      expect(result).toContain("GET");
      expect(result).toContain("application/json");
    });

    it("renders javascript rest template with body", () => {
      const result = renderCodeSnippet("javascript", "rest" as any, {
        ...restContext,
        method: "POST",
        body: '{"name": "test"}',
      });

      expect(result).toContain("POST");
      expect(result).toContain('{"name": "test"}');
    });

    it("renders python rest template with url, method, and headers", () => {
      const result = renderCodeSnippet("python", "rest" as any, restContext);

      expect(result).toContain("import requests");
      expect(result).toContain("https://api.example.com/users");
      expect(result).toContain("requests.get(");
      expect(result).toContain("application/json");
    });

    it("renders python rest template with body", () => {
      const result = renderCodeSnippet("python", "rest" as any, {
        ...restContext,
        method: "POST",
        methodLower: "post",
        body: '{"name": "test"}',
      });

      expect(result).toContain("requests.post(");
      expect(result).toContain("data = ");
      expect(result).toContain('{"name": "test"}');
    });

    it("renders java rest template with url, method, and headers", () => {
      const result = renderCodeSnippet("java", "rest" as any, restContext);

      expect(result).toContain("import java.net.http.HttpClient");
      expect(result).toContain("https://api.example.com/users");
      expect(result).toContain('"GET"');
      expect(result).toContain("Accept");
    });

    it("renders java rest template with body", () => {
      const result = renderCodeSnippet("java", "rest" as any, {
        ...restContext,
        method: "POST",
        headerLines: [
          { key: "Accept", value: "application/json" },
          { key: "Content-Type", value: "application/json" },
        ],
        body: '{"name": "test"}',
        bodyEscaped: '{\\"name\\": \\"test\\"}',
      });

      expect(result).toContain('"POST"');
      expect(result).toContain("BodyPublishers.ofString");
      expect(result).toContain("Content-Type");
    });

    it("renders java rest template without body uses noBody()", () => {
      const result = renderCodeSnippet("java", "rest" as any, restContext);

      expect(result).toContain("BodyPublishers.noBody()");
    });

    it("renders rest templates across all languages consistently", () => {
      const jsResult = renderCodeSnippet("javascript", "rest" as any, restContext);
      const pyResult = renderCodeSnippet("python", "rest" as any, restContext);
      const javaResult = renderCodeSnippet("java", "rest" as any, restContext);

      for (const result of [jsResult, pyResult, javaResult]) {
        expect(result).toContain("https://api.example.com/users");
        expect(result.length).toBeGreaterThan(50);
      }
    });
  });

  // ─── GraphQL templates ─────────────────────────────────────────────

  describe("graphql", () => {
    const graphqlContext = {
      endpoint: "https://api.example.com/graphql",
      query: "{ users { id name } }",
      queryEscaped: "{ users { id name } }",
      hasVariables: false,
      headers: { "Content-Type": "application/json" },
      headersJson: JSON.stringify({ "Content-Type": "application/json" }, null, 2),
      headerLines: [{ key: "Content-Type", value: "application/json" }],
    };

    it("renders javascript graphql template with endpoint and query", () => {
      const result = renderCodeSnippet("javascript", "graphql" as any, graphqlContext);

      expect(result).toContain("fetch(");
      expect(result).toContain("https://api.example.com/graphql");
      expect(result).toContain("{ users { id name } }");
      expect(result).toContain("POST");
      expect(result).toContain("JSON.stringify");
    });

    it("renders javascript graphql template with variables", () => {
      const result = renderCodeSnippet("javascript", "graphql" as any, {
        ...graphqlContext,
        hasVariables: true,
        variablesJson: JSON.stringify({ limit: 10 }, null, 2),
      });

      expect(result).toContain("variables");
      expect(result).toContain('"limit": 10');
    });

    it("renders javascript graphql template with operationName", () => {
      const result = renderCodeSnippet("javascript", "graphql" as any, {
        ...graphqlContext,
        operationName: "GetUsers",
      });

      expect(result).toContain("operationName");
      expect(result).toContain("GetUsers");
    });

    it("renders python graphql template with endpoint and query", () => {
      const result = renderCodeSnippet("python", "graphql" as any, graphqlContext);

      expect(result).toContain("import requests");
      expect(result).toContain("https://api.example.com/graphql");
      expect(result).toContain("{ users { id name } }");
      expect(result).toContain("requests.post(");
    });

    it("renders python graphql template with variables", () => {
      const result = renderCodeSnippet("python", "graphql" as any, {
        ...graphqlContext,
        hasVariables: true,
        variablesJson: JSON.stringify({ id: "123" }, null, 2),
      });

      expect(result).toContain("variables");
      expect(result).toContain('"id": "123"');
    });

    it("renders python graphql template with operationName", () => {
      const result = renderCodeSnippet("python", "graphql" as any, {
        ...graphqlContext,
        operationName: "ListUsers",
      });

      expect(result).toContain("operationName");
      expect(result).toContain("ListUsers");
    });

    it("renders java graphql template with endpoint and query", () => {
      const result = renderCodeSnippet("java", "graphql" as any, graphqlContext);

      expect(result).toContain("import java.net.http.HttpClient");
      expect(result).toContain("https://api.example.com/graphql");
      expect(result).toContain("{ users { id name } }");
      expect(result).toContain(".POST(");
    });

    it("renders java graphql template with variables", () => {
      const result = renderCodeSnippet("java", "graphql" as any, {
        ...graphqlContext,
        hasVariables: true,
        variablesJson: JSON.stringify({ offset: 0 }, null, 2),
        variablesEscaped: '{\\"offset\\":0}',
      });

      expect(result).toContain("variables");
    });

    it("renders graphql templates across all languages consistently", () => {
      const jsResult = renderCodeSnippet("javascript", "graphql" as any, graphqlContext);
      const pyResult = renderCodeSnippet("python", "graphql" as any, graphqlContext);
      const javaResult = renderCodeSnippet("java", "graphql" as any, graphqlContext);

      for (const result of [jsResult, pyResult, javaResult]) {
        expect(result).toContain("https://api.example.com/graphql");
        expect(result.length).toBeGreaterThan(50);
      }
    });
  });

  // ─── Invalid language / engine ──────────────────────────────────────

  describe("invalid language or engine", () => {
    it("returns empty string for an unsupported language", () => {
      const result = renderCodeSnippet("ruby" as any, "mysql", {
        connectionString: "test",
      });

      expect(result).toBe("");
    });

    it("returns empty string for an unsupported engine", () => {
      const result = renderCodeSnippet("javascript", "oracle" as any, {
        connectionString: "test",
      });

      expect(result).toBe("");
    });

    it("returns empty string for both unsupported language and engine", () => {
      const result = renderCodeSnippet("go" as any, "oracle" as any, {});

      expect(result).toBe("");
    });
  });

  // ─── Context variable interpolation ─────────────────────────────────

  describe("context variable interpolation", () => {
    it("interpolates triple-braced Mustache variables without HTML escaping", () => {
      const result = renderCodeSnippet("javascript", "mysql", {
        connectionString: "mysql://root:p@ss&word@localhost:3306/db",
        sql: "SELECT * FROM t WHERE name = 'O&Brien'",
      });

      // Triple braces should not escape & or '
      expect(result).toContain("mysql://root:p@ss&word@localhost:3306/db");
      expect(result).toContain("SELECT * FROM t WHERE name = 'O&Brien'");
    });

    it("handles empty context values gracefully", () => {
      const result = renderCodeSnippet("javascript", "mysql", {
        connectionString: "",
        sql: "",
      });

      expect(result).toContain("createConnection('')");
    });

    it("handles context values containing special characters", () => {
      const result = renderCodeSnippet("python", "postgres", {
        connectionString: "postgresql://user:p@$$w0rd!@host/db?sslmode=require",
        sql: 'SELECT "column" FROM "schema"."table"',
      });

      expect(result).toContain("postgresql://user:p@$$w0rd!@host/db?sslmode=require");
      expect(result).toContain('SELECT "column" FROM "schema"."table"');
    });

    it("renders multiple distinct context variables in one template", () => {
      const result = renderCodeSnippet("python", "cassandra", {
        host: "cass-host.example.com",
        port: "19042",
        username: "admin",
        password: "S3cret!",
        keyspace: "analytics",
        sql: "SELECT COUNT(*) FROM events",
      });

      expect(result).toContain("Cluster(['cass-host.example.com'], port=19042");
      expect(result).toContain("username='admin'");
      expect(result).toContain("password='S3cret!'");
      expect(result).toContain("session.execute('USE analytics')");
      expect(result).toContain("SELECT COUNT(*) FROM events");
    });

    it("renders cosmosdb context variables across languages consistently", () => {
      const context = {
        connectionString: "AccountEndpoint=https://acct.documents.azure.com;AccountKey=key123",
        databaseId: "proddb",
        tableId: "items",
      };

      const jsResult = renderCodeSnippet("javascript", "cosmosdb", {
        ...context,
        sql: 'client.database("proddb").container("items").items.readAll().fetchAll()',
      });
      const pyResult = renderCodeSnippet("python", "cosmosdb", context);
      const javaResult = renderCodeSnippet("java", "cosmosdb", context);

      // All three should include the connection string and identifiers
      for (const result of [jsResult, pyResult, javaResult]) {
        expect(result).toContain("AccountEndpoint=https://acct.documents.azure.com;AccountKey=key123");
      }
      expect(pyResult).toContain("'proddb'");
      expect(pyResult).toContain("'items'");
      expect(javaResult).toContain('"proddb"');
      expect(javaResult).toContain('"items"');
    });

    it("preserves multiline SQL in templates", () => {
      const multilineSql = "SELECT\n  id,\n  name\nFROM users\nWHERE active = 1";
      const result = renderCodeSnippet("java", "mysql", {
        jdbcUrl: "jdbc:mysql://localhost/db",
        escapedSql: multilineSql,
      });

      expect(result).toContain("SELECT\n  id,\n  name\nFROM users\nWHERE active = 1");
    });
  });

  // ─── Return value trimming ──────────────────────────────────────────

  describe("return value trimming", () => {
    it("trims the rendered output for non-Gradle snippets", () => {
      const result = renderCodeSnippet("javascript", "mysql", {
        connectionString: "mysql://localhost/db",
        sql: "SELECT 1",
      });

      expect(result).toBe(result.trim());
    });

    it("trims the Gradle-wrapped output", () => {
      const result = renderCodeSnippet(
        "java",
        "mysql",
        { jdbcUrl: "jdbc:mysql://localhost/db", escapedSql: "SELECT 1" },
        {
          gradleDep: "    implementation 'mysql:mysql-connector-java:8.0.33'",
          mainJavaComment: "// Main.java",
        },
      );

      expect(result).toBe(result.trim());
    });
  });
});
