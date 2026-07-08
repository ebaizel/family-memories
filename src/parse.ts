/**
 * Figure out which kid a message is about.
 *
 * Supported forms (case-insensitive against known kid names):
 *   "Maya: the moon is following our car"   → kid Maya, text after the colon
 *   "Maya - I did it myself"                → same, with a dash
 *   "#maya splashing in puddles"            → hashtag anywhere in the text
 *
 * Returns the matched kid name (as stored) and the text with the tag removed.
 */
export function parseKidTag(
  text: string,
  kidNames: string[],
): { kidName: string | null; text: string } {
  const trimmed = text.trim();

  const prefix = trimmed.match(/^([\p{L}\p{M}'-]+)\s*[:\-–—]\s*(.+)$/su);
  if (prefix) {
    const match = kidNames.find((n) => n.toLowerCase() === prefix[1].toLowerCase());
    if (match) return { kidName: match, text: prefix[2].trim() };
  }

  for (const name of kidNames) {
    const tag = new RegExp(`#${escapeRegExp(name)}\\b`, "iu");
    if (tag.test(trimmed)) {
      return { kidName: name, text: trimmed.replace(tag, "").replace(/\s{2,}/g, " ").trim() };
    }
  }

  return { kidName: null, text: trimmed };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
