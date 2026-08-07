/** Shared HTML sanitizer for the few places the app renders raw HTML strings. */
import DOMPurify from "dompurify";

/**
 * Sanitizes an HTML string before it is handed to `dangerouslySetInnerHTML`.
 *
 * Record values come straight out of whatever database the user connected to, so they
 * must be treated as untrusted input: a cell containing `<img src=x onerror=...>` would
 * otherwise execute inside the app, which can reach the local sidecar API. Scripts,
 * event handlers, and dangerous URL protocols are stripped while ordinary formatting
 * markup is preserved.
 *
 * @param html - The untrusted HTML string to clean.
 * @returns Sanitized HTML that is safe to inject into the DOM.
 */
export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(String(html ?? ""), {
    // Block `javascript:`/`data:` navigations while still allowing normal links.
    ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|ftp):|^[^a-z]*(?:[#/?]|$)/i,
  });
}
