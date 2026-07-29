/** Configures Monaco Editor ESM workers and re-exports the monaco-editor module. */
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/edcore.main";
import * as jsonLanguage from "monaco-editor/esm/vs/language/json/monaco.contribution";
import * as htmlLanguage from "monaco-editor/esm/vs/language/html/monaco.contribution";
import * as typescriptLanguage from "monaco-editor/esm/vs/language/typescript/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";

// edcore.main skips the language namespace assignments that editor.main does.
// Re-assign them explicitly and configure TS/JS defaults.
(monaco.languages as any).json = jsonLanguage;
(monaco.languages as any).html = htmlLanguage;
(monaco.languages as any).typescript = typescriptLanguage;

// @ts-ignore — monaco types mark languages.typescript as deprecated but it works at runtime
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  noLib: true,
  allowNonTsExtensions: true,
});

import "monaco-editor/esm/vs/basic-languages/html/html.contribution";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") return new jsonWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};

// Expose globally for e2e tests and debugging
(window as any).monaco = monaco;

export default monaco;
export { monaco };
