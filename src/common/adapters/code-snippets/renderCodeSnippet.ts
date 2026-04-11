/** Code snippet renderer — renders bundled Mustache templates for code generation. */

import Mustache from "mustache";

// Bundled .mustache templates imported as raw strings (offline fallback)
import bundledJavascriptMysql from "src/common/adapters/code-snippets/templates/javascript.mysql.mustache?raw";
import bundledJavascriptPostgres from "src/common/adapters/code-snippets/templates/javascript.postgres.mustache?raw";
import bundledJavascriptSqlite from "src/common/adapters/code-snippets/templates/javascript.sqlite.mustache?raw";
import bundledJavascriptMssql from "src/common/adapters/code-snippets/templates/javascript.mssql.mustache?raw";
import bundledJavascriptCassandra from "src/common/adapters/code-snippets/templates/javascript.cassandra.mustache?raw";
import bundledJavascriptMongodb from "src/common/adapters/code-snippets/templates/javascript.mongodb.mustache?raw";
import bundledJavascriptRedis from "src/common/adapters/code-snippets/templates/javascript.redis.mustache?raw";
import bundledJavascriptCosmosdb from "src/common/adapters/code-snippets/templates/javascript.cosmosdb.mustache?raw";
import bundledJavascriptSfdc from "src/common/adapters/code-snippets/templates/javascript.sfdc.mustache?raw";
import bundledJavascriptAztable from "src/common/adapters/code-snippets/templates/javascript.aztable.mustache?raw";
import bundledPythonMysql from "src/common/adapters/code-snippets/templates/python.mysql.mustache?raw";
import bundledPythonPostgres from "src/common/adapters/code-snippets/templates/python.postgres.mustache?raw";
import bundledPythonSqlite from "src/common/adapters/code-snippets/templates/python.sqlite.mustache?raw";
import bundledPythonMssql from "src/common/adapters/code-snippets/templates/python.mssql.mustache?raw";
import bundledPythonCassandra from "src/common/adapters/code-snippets/templates/python.cassandra.mustache?raw";
import bundledPythonMongodb from "src/common/adapters/code-snippets/templates/python.mongodb.mustache?raw";
import bundledPythonRedis from "src/common/adapters/code-snippets/templates/python.redis.mustache?raw";
import bundledPythonCosmosdb from "src/common/adapters/code-snippets/templates/python.cosmosdb.mustache?raw";
import bundledPythonSfdc from "src/common/adapters/code-snippets/templates/python.sfdc.mustache?raw";
import bundledPythonAztable from "src/common/adapters/code-snippets/templates/python.aztable.mustache?raw";
import bundledJavaMysql from "src/common/adapters/code-snippets/templates/java.mysql.mustache?raw";
import bundledJavaPostgres from "src/common/adapters/code-snippets/templates/java.postgres.mustache?raw";
import bundledJavaSqlite from "src/common/adapters/code-snippets/templates/java.sqlite.mustache?raw";
import bundledJavaMssql from "src/common/adapters/code-snippets/templates/java.mssql.mustache?raw";
import bundledJavaCassandra from "src/common/adapters/code-snippets/templates/java.cassandra.mustache?raw";
import bundledJavaMongodb from "src/common/adapters/code-snippets/templates/java.mongodb.mustache?raw";
import bundledJavaRedis from "src/common/adapters/code-snippets/templates/java.redis.mustache?raw";
import bundledJavaCosmosdb from "src/common/adapters/code-snippets/templates/java.cosmosdb.mustache?raw";
import bundledJavaSfdc from "src/common/adapters/code-snippets/templates/java.sfdc.mustache?raw";
import bundledJavaAztable from "src/common/adapters/code-snippets/templates/java.aztable.mustache?raw";
import bundledJavascriptRest from "src/common/adapters/code-snippets/templates/javascript.rest.mustache?raw";
import bundledPythonRest from "src/common/adapters/code-snippets/templates/python.rest.mustache?raw";
import bundledJavaRest from "src/common/adapters/code-snippets/templates/java.rest.mustache?raw";
import bundledJavascriptGraphql from "src/common/adapters/code-snippets/templates/javascript.graphql.mustache?raw";
import bundledPythonGraphql from "src/common/adapters/code-snippets/templates/python.graphql.mustache?raw";
import bundledJavaGraphql from "src/common/adapters/code-snippets/templates/java.graphql.mustache?raw";
import bundledJavaGradle from "src/common/adapters/code-snippets/templates/java.gradle.mustache?raw";

/** Supported database engine types for code snippet generation. */
type Engine =
  | "mysql"
  | "postgres"
  | "sqlite"
  | "mssql"
  | "cassandra"
  | "mongodb"
  | "redis"
  | "cosmosdb"
  | "aztable"
  | "sfdc"
  | "rest"
  | "graphql";

/** Supported programming languages for code snippet generation. */
type Language = "javascript" | "python" | "java";

/** Bundled templates organized by language and engine. */
const bundledTemplates: Record<Language, Record<Engine, string>> = {
  javascript: {
    mysql: bundledJavascriptMysql,
    postgres: bundledJavascriptPostgres,
    sqlite: bundledJavascriptSqlite,
    mssql: bundledJavascriptMssql,
    cassandra: bundledJavascriptCassandra,
    mongodb: bundledJavascriptMongodb,
    redis: bundledJavascriptRedis,
    cosmosdb: bundledJavascriptCosmosdb,
    sfdc: bundledJavascriptSfdc,
    aztable: bundledJavascriptAztable,
    rest: bundledJavascriptRest,
    graphql: bundledJavascriptGraphql,
  },
  python: {
    mysql: bundledPythonMysql,
    postgres: bundledPythonPostgres,
    sqlite: bundledPythonSqlite,
    mssql: bundledPythonMssql,
    cassandra: bundledPythonCassandra,
    mongodb: bundledPythonMongodb,
    redis: bundledPythonRedis,
    cosmosdb: bundledPythonCosmosdb,
    sfdc: bundledPythonSfdc,
    aztable: bundledPythonAztable,
    rest: bundledPythonRest,
    graphql: bundledPythonGraphql,
  },
  java: {
    mysql: bundledJavaMysql,
    postgres: bundledJavaPostgres,
    sqlite: bundledJavaSqlite,
    mssql: bundledJavaMssql,
    cassandra: bundledJavaCassandra,
    mongodb: bundledJavaMongodb,
    redis: bundledJavaRedis,
    cosmosdb: bundledJavaCosmosdb,
    sfdc: bundledJavaSfdc,
    aztable: bundledJavaAztable,
    rest: bundledJavaRest,
    graphql: bundledJavaGraphql,
  },
};

/** Bundled Java Gradle instructions — offline fallback. */
const bundledJavaGradleInstructions: string = bundledJavaGradle;

/** Active templates — uses bundled templates baked into the build. */
const templates: Record<Language, Record<Engine, string>> = JSON.parse(JSON.stringify(bundledTemplates));

/** Active Java Gradle instructions — uses bundled template. */
const javaGradleInstructions: string = bundledJavaGradleInstructions;

/**
 * Assembles a complete Gradle project snippet combining build.gradle instructions and Java source code.
 * @param options.connectDescription - Optional human-readable description of what the snippet connects to.
 * @param options.gradleDep - The Gradle dependency block string to embed in build.gradle.
 * @param options.mainJavaComment - A block comment placed above the Main.java source code.
 * @param options.mainJavaCode - The rendered Main.java source code to embed.
 * @returns The full Gradle project snippet as a single string.
 */
function buildJavaGradleSnippet(options: {
  connectDescription?: string;
  gradleDep: string;
  mainJavaComment: string;
  mainJavaCode: string;
}): string {
  const connectSection = options.connectDescription
    ? `\n *\n * This will:\n * - Connect to ${options.connectDescription}\n * - Run your query against the database`
    : "";

  return `/**
 * build.gradle
 *
${javaGradleInstructions}${connectSection}
 */
plugins {
    id 'application'
}

repositories {
    mavenCentral()
}

dependencies {
${options.gradleDep}
}

application {
    mainClass = 'Main'
}


${options.mainJavaComment}

${options.mainJavaCode}`.trim();
}

/**
 * Renders a code snippet by applying Mustache templating to a language/engine-specific template.
 * For Java, optionally wraps the output in a Gradle project structure.
 * @param language - The target programming language.
 * @param engine - The database engine type.
 * @param context - Template variables to interpolate (e.g., connectionString, sql).
 * @param javaGradleOptions - Optional Gradle build configuration for Java snippets.
 * @returns The rendered code snippet string, or empty string if no template exists.
 */
export function renderCodeSnippet(
  language: Language,
  engine: Engine,
  context: Record<string, any>,
  javaGradleOptions?: {
    connectDescription?: string;
    gradleDep: string;
    mainJavaComment: string;
  },
): string {
  const template = templates[language]?.[engine];
  if (!template) {
    return "";
  }

  const rendered = Mustache.render(template, context);

  if (language === "java" && javaGradleOptions) {
    return buildJavaGradleSnippet({
      connectDescription: javaGradleOptions.connectDescription,
      gradleDep: javaGradleOptions.gradleDep,
      mainJavaComment: javaGradleOptions.mainJavaComment,
      mainJavaCode: rendered,
    });
  }

  return rendered.trim();
}
