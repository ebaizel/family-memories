/**
 * Figure out which kid(s) a message is about.
 *
 * Supported forms (case-insensitive against known kid names):
 *   "Maya: the moon is following our car"       → Maya
 *   "Maya + Leo: built a fort"                  → Maya and Leo
 *   "maya and leo - dance party"                → Maya and Leo (spaced dash)
 *   "Maya, Leo & Zoe: bath chaos"               → all three
 *   "splashing in puddles #maya #leo"           → hashtags, any number, anywhere
 *
 * A name-prefix only counts when EVERY listed name is a known kid —
 * "Grandma: look at this" stays plain text.
 *
 * Returns the matched kid names (as stored) and the text with tags removed.
 */
export function parseKidTags(
  text: string,
  kidNames: string[],
): { kidNames: string[]; text: string } {
  const trimmed = text.trim();

  // Prefix before a colon, or before a dash that has spaces around it
  // (bare dashes stay untouched so hyphenated names like Anne-Marie work).
  for (const re of [/^([^:\n]+?)\s*:\s*(.+)$/su, /^([^\n]+?)\s+[-–—]\s+(.+)$/su]) {
    const m = trimmed.match(re);
    if (!m) continue;
    const parts = m[1]
      .split(/\s*(?:[+&,]|\band\b)\s*/iu)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) continue;
    const matched = parts.map((p) => kidNames.find((n) => n.toLowerCase() === p.toLowerCase()));
    if (matched.length && matched.every((k): k is string => Boolean(k))) {
      return { kidNames: [...new Set(matched)], text: m[2].trim() };
    }
  }

  // Hashtags: collect every kid tagged anywhere in the message.
  let rest = trimmed;
  const found: string[] = [];
  for (const name of kidNames) {
    const tag = new RegExp(`#${escapeRegExp(name)}\\b`, "iu");
    if (tag.test(rest)) {
      found.push(name);
      rest = rest.replace(tag, "");
    }
  }
  if (found.length) {
    return { kidNames: found, text: rest.replace(/\s{2,}/g, " ").trim() };
  }

  return { kidNames: [], text: trimmed };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
