export const javaGradleInstructions = ` * INSTRUCTIONS
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
