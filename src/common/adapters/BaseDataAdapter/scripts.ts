import { getDialectType } from "src/common/adapters/DataScriptFactory";
import IDataScript from "src/common/adapters/IDataScript";
import { SqlAction, SqluiCore } from "typings";

const JAVA_GRADLE_INSTRUCTIONS = ` * INSTRUCTIONS
 *
 * 1. Install Java 17+:
 *    java -version
 *
 * 2. Create a project folder:
 *    mkdir my-db-java && cd my-db-java
 *
 * 3. Add these files:
 *    - build.gradle (this file)
 *    - src/main/java/Main.java (create folders as needed)
 *
 * 4. Get Gradle Wrapper (./gradlew) if not already present:
 *
 *    a. Install Gradle globally (optional):
 *
 *       macOS:
 *         brew install gradle
 *
 *       Ubuntu / Debian (Gradle 8+ via SDKMAN - recommended):
 *         sudo apt-get update && sudo apt-get install -y curl zip unzip
 *         curl -s "https://get.sdkman.io" | bash
 *         source "$HOME/.sdkman/bin/sdkman-init.sh"
 *         sdk install gradle
 *
 *       Linux (manual):
 *         wget https://services.gradle.org/distributions/gradle-8.5-bin.zip
 *         sudo mkdir -p /opt/gradle
 *         sudo unzip -d /opt/gradle gradle-8.5-bin.zip
 *         export PATH=$PATH:/opt/gradle/gradle-8.5/bin
 *
 *       Windows (Scoop):
 *         scoop install gradle
 *
 *       Windows (Chocolatey):
 *         choco install gradle
 *
 *       Windows (manual):
 *         Download from https://gradle.org/releases/
 *         Extract to C:\\Gradle
 *         Add C:\\Gradle\\gradle-8.5\\bin to your PATH environment variable
 *
 *    b. Or generate Gradle wrapper using installed Gradle:
 *       gradle wrapper
 *
 *       This will create:
 *         gradlew
 *         gradlew.bat
 *         gradle/wrapper/gradle-wrapper.jar
 *         gradle/wrapper/gradle-wrapper.properties
 *
 *    c. Make it executable (macOS / Linux):
 *       chmod +x ./gradlew
 *
 * 5. Run the project:
 *    ./gradlew run`;

export function buildJavaGradleSnippet(options: {
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
${JAVA_GRADLE_INSTRUCTIONS}${connectSection}
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

export function getDivider(): SqlAction.Output {
  return {
    label: "divider",
    skipGuide: true,
  };
}

export default abstract class BaseDataScript implements IDataScript {
  dialects: string[] = [];

  isDialectSupported(dialect?: string) {
    return !!dialect && this.dialects.indexOf(dialect) >= 0;
  }

  getConnectionFormInputs() {
    return [
      ["username", "Username"],
      ["password", "Password"],
      ["host", "Host"],
      ["port", "Port", "optional"],
    ];
  }

  getIsTableIdRequiredForQuery() {
    return false;
  }

  getSyntaxMode() {
    return "sql";
  }

  supportMigration() {
    return false;
  }

  supportCreateRecordForm() {
    return false;
  }

  supportEditRecordForm() {
    return false;
  }

  supportVisualization() {
    return false;
  }

  // dialect definitions
  getDialectType(dialect?: SqluiCore.Dialect) {
    // attempt to return the first item in the dialects / schemes
    if (dialect && this.dialects.indexOf(dialect) >= 0) {
      return dialect as SqluiCore.Dialect;
    }

    return undefined;
  }

  getDialectName(dialect?: SqluiCore.Dialect): string {
    // capitalize the first letter
    return (dialect || "").replace(/^\w/, (c) => c.toUpperCase());
  }

  getDialectIcon(dialect?: SqluiCore.Dialect): string {
    return `${process.env.PUBLIC_URL}/assets/${dialect}.png`;
  }

  // sample data script
  getTableScripts(): SqlAction.TableActionScriptGenerator[] {
    return [];
  }

  getDatabaseScripts(): SqlAction.DatabaseActionScriptGenerator[] {
    return [];
  }

  getConnectionScripts(): SqlAction.ConnectionActionScriptGenerator[] {
    return [];
  }

  getSampleConnectionString(dialect?: SqluiCore.Dialect) {
    return "";
  }

  getSampleSelectQuery(actionInput: SqlAction.TableInput): SqlAction.Output | undefined {
    return undefined;
  }

  // sample code snippet
  getCodeSnippet(connection: SqluiCore.ConnectionProps, query: SqluiCore.ConnectionQuery, language: SqluiCore.LanguageMode) {
    switch (language) {
      case "javascript":
        // TODO: implement me
        return "";
      case "python":
        // TODO: implement me
        return "";
      case "java":
        // TODO: implement me
        return "";
      default:
        return "";
    }
  }
}
