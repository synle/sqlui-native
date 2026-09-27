/**
 * Configures Monaco Editor ESM workers and re-exports the monaco-editor module.
 *
 * Only the JSON language service (validation, folding, formatting of result/settings JSON)
 * is loaded. JavaScript/TypeScript and HTML use the Monarch grammars from
 * `basic-languages/*` for highlighting; their language services were dropped because
 * they ship a 7.0 MB `ts.worker` and a 695 kB `html.worker` for features the app does not
 * use (`noLib` JS intellisense, HTML completion in read-only response viewers).
 */
import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/editor/edcore.main";
import * as jsonLanguage from "monaco-editor/esm/vs/language/json/monaco.contribution";
import "monaco-editor/esm/vs/basic-languages/sql/sql.contribution";
import "monaco-editor/esm/vs/basic-languages/javascript/javascript.contribution";
import "monaco-editor/esm/vs/basic-languages/graphql/graphql.contribution";
import "monaco-editor/esm/vs/basic-languages/shell/shell.contribution";
import "monaco-editor/esm/vs/basic-languages/html/html.contribution";
import "monaco-editor/esm/vs/basic-languages/css/css.contribution";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution";
import "monaco-editor/esm/vs/basic-languages/java/java.contribution";
import "monaco-editor/esm/vs/basic-languages/typescript/typescript.contribution";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

// edcore.main skips the language namespace assignments that editor.main does.
(monaco.languages as any).json = jsonLanguage;

self.MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === "json") return new jsonWorker();
    return new editorWorker();
  },
};

// Expose globally for e2e tests and debugging
(window as any).monaco = monaco;

export default monaco;
export { monaco };
