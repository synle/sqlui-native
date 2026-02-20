import Mustache from "mustache";
import { javaGradleInstructions } from "./javaGradlePartial";
import * as javaTemplates from "./java";
import * as javascriptTemplates from "./javascript";
import * as pythonTemplates from "./python";

type Engine = "relational" | "cassandra" | "mongodb" | "redis" | "cosmosdb" | "aztable";
type Language = "javascript" | "python" | "java";

const templates: Record<Language, Record<Engine, string>> = {
  javascript: javascriptTemplates,
  python: pythonTemplates,
  java: javaTemplates,
};

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
