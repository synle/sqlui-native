import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

/**
 * `monacoSetup.ts` hand-composes the Monaco entry instead of importing `monaco-editor`, so that the
 * ~85 language grammars and the css language service Monaco ships with are not bundled. The tradeoff
 * is that every language the app can actually open must be imported explicitly — miss one and the
 * editor silently renders it as plaintext with no error anywhere.
 *
 * These tests derive the required set from the sources that produce language ids, so adding a new
 * dialect or a new `LanguageMode` fails here instead of shipping as a silent highlighting regression.
 */

const ROOT = path.resolve(__dirname, "../..");
const monacoSetupSource = fs.readFileSync(path.join(ROOT, "src/frontend/monacoSetup.ts"), "utf8");

/** Language ids `monacoSetup.ts` imports a Monarch grammar for. */
function importedBasicLanguages(): Set<string> {
  const ids = new Set<string>();
  const pattern = /basic-languages\/([^/]+)\/[^/]+\.contribution/g;
  for (const match of monacoSetupSource.matchAll(pattern)) {
    ids.add(match[1]);
  }
  return ids;
}

/** Every value the `SqluiCore.LanguageMode` union can take. */
function declaredLanguageModes(): string[] {
  const typings = fs.readFileSync(path.join(ROOT, "typings/index.ts"), "utf8");
  const declaration = typings.match(/export type LanguageMode\s*=\s*([^;]+);/);
  expect(declaration, "SqluiCore.LanguageMode should be a string union in typings/index.ts").toBeTruthy();
  return [...declaration![1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

/** Every distinct value an adapter's `getSyntaxMode()` returns. */
function adapterSyntaxModes(): string[] {
  const adaptersDir = path.join(ROOT, "src/common/adapters");
  const modes = new Set<string>();
  for (const adapter of fs.readdirSync(adaptersDir)) {
    const scripts = path.join(adaptersDir, adapter, "scripts.ts");
    if (!fs.existsSync(scripts)) {
      continue;
    }
    const match = fs.readFileSync(scripts, "utf8").match(/getSyntaxMode\(\)\s*{\s*return\s*"([^"]+)"/);
    if (match) {
      modes.add(match[1]);
    }
  }
  return [...modes];
}

describe("monacoSetup language coverage", () => {
  test("imports a grammar for every adapter syntax mode", () => {
    const imported = importedBasicLanguages();
    const modes = adapterSyntaxModes();

    // Guard against the discovery itself silently breaking.
    expect(modes.length).toBeGreaterThan(0);
    expect(modes).toContain("sql");

    for (const mode of modes) {
      expect(imported, `getSyntaxMode() returns "${mode}" but monacoSetup.ts imports no grammar for it`).toContain(mode);
    }
  });

  test("imports a grammar for every SqluiCore.LanguageMode", () => {
    const imported = importedBasicLanguages();
    const modes = declaredLanguageModes();

    expect(modes.length).toBeGreaterThan(0);

    for (const mode of modes) {
      expect(imported, `LanguageMode "${mode}" renders as a code snippet but monacoSetup.ts imports no grammar for it`).toContain(mode);
    }
  });

  test("imports the html grammar, not just the html language service", () => {
    // RestApiResultBox sniffs HTML response bodies and renders them with language="html".
    // The language service supplies completion and formatting but no tokenizer.
    expect(importedBasicLanguages()).toContain("html");
  });

  test("imports the css grammar so <style> blocks inside html are tokenized", () => {
    // The html Monarch grammar switches to the text/css embedded mode inside <style>.
    expect(importedBasicLanguages()).toContain("css");
  });

  test("does not import the css language service, which would re-add the css.worker chunk", () => {
    expect(monacoSetupSource).not.toContain("language/css/monaco.contribution");
  });

  test("re-assigns the language namespaces that edcore.main skips", () => {
    // App.tsx reads monaco.languages.typescript.javascriptDefaults; editor.main would set this up.
    for (const namespace of ["json", "html", "typescript"]) {
      expect(monacoSetupSource).toMatch(new RegExp(`languages as any\\)\\.${namespace}\\s*=`));
    }
  });
});
