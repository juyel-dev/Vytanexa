/**
 * Serialize a JSON-LD object for `<script type="application/ld+json">`.
 * Plain `JSON.stringify` is NOT safe inside a script tag: any DB-sourced
 * string containing `</script>` (a hospital/article/FAQ text typed in the
 * admin panel) would close the tag and inject markup. Escaping `<` (and
 * the U+2028/9 line separators) keeps the JSON valid and the page safe.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
