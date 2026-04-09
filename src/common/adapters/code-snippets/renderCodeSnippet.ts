/** Code snippet renderer — renders Mustache templates with optional remote update. */

import Mustache from "mustache";
import { version as appVersion } from "../../../package.json";
import { PersistentStorage } from "src/common/PersistentStorage";

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
import bundledJavaGradle from "src/common/adapters/code-snippets/templates/java.gradle.mustache?raw";

/** Supported database engine types for code snippet generation. */
type Engine = "mysql" | "postgres" | "sqlite" | "mssql" | "cassandra" | "mongodb" | "redis" | "cosmosdb" | "aztable" | "sfdc";

/** Supported programming languages for code snippet generation. */
type Language = "javascript" | "python" | "java";

/** All language-engine template keys for iteration. */
const TEMPLATE_KEYS: Array<{ language: Language; engine: Engine }> = [];
const LANGUAGES: Language[] = ["javascript", "python", "java"];
const ENGINES: Engine[] = ["mysql", "postgres", "sqlite", "mssql", "cassandra", "mongodb", "redis", "cosmosdb", "aztable", "sfdc"];
for (const language of LANGUAGES) {
  for (const engine of ENGINES) {
    TEMPLATE_KEYS.push({ language, engine });
  }
}

/** Bundled templates organized by language and engine — serves as offline fallback. */
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
  },
};

/** Bundled Java Gradle instructions — offline fallback. */
const bundledJavaGradleInstructions: string = bundledJavaGradle;

/** Disk cache shape for persisted templates. */
type TemplateCache = {
  id: string;
  version: string;
  templates: Record<Language, Record<Engine, string>>;
  javaGradleInstructions: string;
};

/** Persistent storage for caching fetched templates to disk. */
const templateCacheStorage = new PersistentStorage<TemplateCache>("cache", "code-snippets", "cache.code-snippets");

/** Cache entry ID — single entry stores all templates. */
const CACHE_ID = "templates";

/** Active templates — starts as bundled, then overridden by disk cache or remote fetch. */
const templates: Record<Language, Record<Engine, string>> = JSON.parse(JSON.stringify(bundledTemplates));

/** Active Java Gradle instructions — starts as bundled, then overridden by disk cache or remote fetch. */
let javaGradleInstructions: string = bundledJavaGradleInstructions;

/**
 * Loads cached templates from disk into the active in-memory templates.
 * Called synchronously on module init before any render call.
 */
function loadCacheFromDisk(): void {
  try {
    const cached = templateCacheStorage.get(CACHE_ID);
    if (!cached?.templates || cached.version !== appVersion) {
      return;
    }
    for (const language of LANGUAGES) {
      for (const engine of ENGINES) {
        if (cached.templates[language]?.[engine]) {
          templates[language][engine] = cached.templates[language][engine];
        }
      }
    }
    if (cached.javaGradleInstructions) {
      javaGradleInstructions = cached.javaGradleInstructions;
    }
  } catch (_err) {
    // Non-fatal — bundled templates remain active
  }
}

/** Saves the current in-memory templates to disk cache. */
function saveCacheToDisk(): void {
  try {
    const entry: TemplateCache = { id: CACHE_ID, version: appVersion, templates, javaGradleInstructions };
    if (templateCacheStorage.get(CACHE_ID)) {
      templateCacheStorage.update(entry);
    } else {
      templateCacheStorage.add(entry);
    }
  } catch (_err) {
    // Non-fatal — cache write failure doesn't affect functionality
  }
}

// Load disk cache on module init (synchronous, before any render call)
loadCacheFromDisk();

/** Base URL for fetching raw mustache templates from GitHub. */
const REMOTE_BASE_URL = "https://raw.githubusercontent.com/synle/sqlui-native/refs/heads/main/src/common/adapters/code-snippets/templates";

/** Whether a remote refresh has already been triggered this session. */
let remoteRefreshTriggered = false;

/**
 * Fetches a single template from GitHub raw content.
 * @param fileName - The mustache file name (e.g., "javascript.mysql.mustache").
 * @returns The template string, or undefined on failure.
 */
async function fetchRemoteTemplate(fileName: string): Promise<string | undefined> {
  try {
    const response = await fetch(`${REMOTE_BASE_URL}/${fileName}`, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      return undefined;
    }
    const text = await response.text();
    return text && text.trim().length > 0 ? text : undefined;
  } catch (_err) {
    return undefined;
  }
}

/**
 * Background refresh — fetches all templates from GitHub, overrides in-memory copies, and persists to disk.
 * Called once on first use. Failures are silently ignored (bundled/cached fallback remains active).
 */
async function refreshTemplatesFromRemote(): Promise<void> {
  let updated = false;

  // Fetch all language.engine templates in parallel
  const fetches = TEMPLATE_KEYS.map(async ({ language, engine }) => {
    const fileName = `${language}.${engine}.mustache`;
    const content = await fetchRemoteTemplate(fileName);
    if (content) {
      templates[language][engine] = content;
      updated = true;
    }
  });

  // Also fetch the Gradle partial
  fetches.push(
    (async () => {
      const content = await fetchRemoteTemplate("java.gradle.mustache");
      if (content) {
        javaGradleInstructions = content;
        updated = true;
      }
    })(),
  );

  await Promise.allSettled(fetches);

  // Persist to disk if any templates were updated
  if (updated) {
    saveCacheToDisk();
  }
}

/**
 * Triggers a one-time background refresh of templates from GitHub.
 * Safe to call multiple times — only the first call triggers the fetch.
 */
export function triggerRemoteRefresh(): void {
  if (remoteRefreshTriggered) {
    return;
  }
  remoteRefreshTriggered = true;
  refreshTemplatesFromRemote().catch((_err) => {
    // Non-fatal — bundled templates remain active
  });
}

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
 * On first call, triggers a background fetch of updated templates from GitHub.
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
  // Trigger background refresh on first use
  triggerRemoteRefresh();

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
