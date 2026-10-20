/** Escapes literal content before inserting it into a RichText string. */
export function escapeRichText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
