export function getUniqueCreatedAt(
  items: Array<{ id: string; createdAt: number }>,
  preferredCreatedAt: number = Math.floor(Date.now() / 1000),
  excludeItemId?: string,
): number {
  const usedCreatedAt = new Set(
    items
      .filter((item) => item.id !== excludeItemId)
      .map((item) => normalizeCreatedAt(item.createdAt)),
  );

  let createdAt = normalizeCreatedAt(preferredCreatedAt);
  while (usedCreatedAt.has(createdAt)) {
    createdAt += 1;
  }

  return createdAt;
}

export function normalizeCreatedAt(createdAt: number): number {
  return createdAt >= 1_000_000_000_000
    ? Math.floor(createdAt / 1000)
    : Math.floor(createdAt);
}

export function hasDuplicateCreatedAt(
  items: Array<{ createdAt: number }>,
): boolean {
  const seen = new Set<number>();

  return items.some((item) => {
    const createdAt = normalizeCreatedAt(item.createdAt);
    if (seen.has(createdAt)) {
      return true;
    }

    seen.add(createdAt);
    return false;
  });
}
