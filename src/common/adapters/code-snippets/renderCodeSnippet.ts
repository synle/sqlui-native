import Mustache from "mustache";
import { javaGradleInstructions } from "./javaGradlePartial";
import * as javaTemplates from "./java";
import * as javascriptTemplates from "./javascript";
import * as pythonTemplates from "./python";

/** Supported database engine types for code snippet generation. */
type Engine = "relational" | "cassandra" | "mongodb" | "redis" | "cosmosdb" | "aztable" | "sfdc";

/** Supported programming languages for code snippet generation. */
type Language = "javascript" | "python" | "java";

/** Lookup table mapping each language to its per-engine Mustache template strings. */
const templates: Record<Language, Record<Engine, string>> = {
  javascript: javascriptTemplates,
  python: pythonTemplates,
  java: javaTemplates,
};

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
