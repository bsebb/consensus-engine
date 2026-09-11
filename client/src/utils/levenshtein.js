/**
 * Computes Levenshtein edit distance between two strings
 */
export function levenshteinDistance(a, b) {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const row = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 0; i < s1.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      const current = Math.min(
        row[j + 1] + 1,      // deletion
        prev + 1,           // insertion
        row[j] + cost       // substitution
      );
      row[j] = prev;
      prev = current;
    }
    row[s2.length] = prev;
  }

  return row[s2.length];
}

/**
 * Merges similar suggestions (e.g. "Johns House" and "John's House")
 * Threshold: distance <= 2 or similarity ratio >= 0.75
 */
export function deduplicateSuggestions(suggestions) {
  const merged = [];

  for (const item of suggestions) {
    const cleanItem = item.trim();
    if (!cleanItem) continue;

    let foundDuplicate = false;
    for (let i = 0; i < merged.length; i++) {
      const existing = merged[i];
      const dist = levenshteinDistance(cleanItem, existing);
      const maxLen = Math.max(cleanItem.length, existing.length);
      const similarity = 1 - dist / maxLen;

      // Duplicate if edit distance is <= 2 or >75% identical
      if (dist <= 2 || similarity >= 0.75) {
        foundDuplicate = true;
        // Keep the cleaner/longer casing
        if (cleanItem.length > existing.length) {
          merged[i] = cleanItem;
        }
        break;
      }
    }

    if (!foundDuplicate) {
      merged.push(cleanItem);
    }
  }

  return merged;
}
