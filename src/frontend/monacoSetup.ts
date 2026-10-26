/**
 * Configures Monaco Editor ESM workers and re-exports the monaco-editor module.
 *
 * Only the JSON language service (validation, folding, formatting of result/settings JSON)
 * is loaded. JavaScript/TypeScript and HTML use the Monarch grammars from
 * `languages/definitions/*` for highlighting; their language services were dropped because
 * they ship a 7.0 MB `ts.worker` and a 695 kB `html.worker` for features the app does not
 * use (`noLib` JS intellisense, HTML completion in read-only response viewers).
 */
import * as monaco from "monaco-editor/editor";
import "monaco-editor/features/register.all";
import * as jsonLanguage from "monaco-editor/languages/features/json/register";
import "monaco-editor/languages/definitions/sql/register";
import "monaco-editor/languages/definitions/javascript/register";
import "monaco-editor/languages/definitions/graphql/register";
import "monaco-editor/languages/definitions/shell/register";
import "monaco-editor/languages/definitions/html/register";
import "monaco-editor/languages/definitions/css/register";
import "monaco-editor/languages/definitions/python/register";
import "monaco-editor/languages/definitions/java/register";
import "monaco-editor/languages/definitions/typescript/register";

import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import jsonWorker from "monaco-editor/languages/features/json/json.worker.js?worker";

// Keep the JSON language module available through Monaco's language namespace.
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
