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
// Re-assign them explicitly so App.tsx can use monaco.languages.typescript.javascriptDefaults.
(monaco.languages as any).json = jsonLanguage;
(monaco.languages as any).html = htmlLanguage;
(monaco.languages as any).typescript = typescriptLanguage;

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