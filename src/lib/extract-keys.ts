/**
 * Deep-extract all leaf key paths from a JSON-like object.
 *
 * - Objects produce dot-separated paths: `a.b.c`
 * - Arrays produce bracket notation:    `items[].name`
 * - Primitives inside arrays:           `tags[]`
 *
 * @example
 * extractDeepKeys({ user: { name: "A", address: { city: "B" } }, tags: [1] })
 * // → ["user.name", "user.address.city", "tags[]"]
 */
export function extractDeepKeys(obj: unknown): string[] {
  const keys: string[] = [];

  function walk(value: unknown, prefix: string): void {
    if (value === null || value === undefined) {
      // Leaf — null / undefined
      if (prefix) keys.push(prefix);
      return;
    }

    if (Array.isArray(value)) {
      const arrayPath = prefix ? `${prefix}[]` : '[]';

      if (value.length === 0) {
        // Empty array — treat path itself as a leaf
        keys.push(arrayPath);
        return;
      }

      // Inspect the first element to infer structure
      const sample = value[0];

      if (sample !== null && typeof sample === 'object') {
        // Array of objects — recurse into the sample
        walk(sample, arrayPath);
      } else {
        // Array of primitives
        keys.push(arrayPath);
      }
      return;
    }

    if (typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        // Empty object — treat as leaf
        if (prefix) keys.push(prefix);
        return;
      }
      for (const [key, val] of entries) {
        const path = prefix ? `${prefix}.${key}` : key;
        walk(val, path);
      }
      return;
    }

    // Primitive (string, number, boolean)
    if (prefix) keys.push(prefix);
  }

  walk(obj, '');
  return keys;
}
