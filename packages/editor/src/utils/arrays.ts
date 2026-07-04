/**
 * Array helpers — adapted from Omniclip `s/utils`.
 */

/** Keep first occurrence of each `key` value. */
export function removeDuplicatesByKey<T>(arr: T[], keyName: keyof T): T[] {
  const seen = new Map<T[keyof T], T>();
  for (const item of arr) {
    if (!seen.has(item[keyName])) seen.set(item[keyName], item);
  }
  return [...seen.values()];
}

/** Diff two id-keyed lists into add / remove sets. */
export function compareById<T extends { id: string }>(
  original: T[],
  next: T[],
): { add: T[]; remove: T[] } {
  const add = next.filter((item) => !original.some((o) => o.id === item.id));
  const remove = original.filter((item) => !next.some((n) => n.id === item.id));
  return { add, remove };
}
