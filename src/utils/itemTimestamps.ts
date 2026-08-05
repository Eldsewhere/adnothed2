export function getUniqueCreatedAt(
  items: Array<{ id: string; createdAt: number }>,
  preferredCreatedAt: number = Math.floor(Date.now() / 1000),
  excludeItemId?: string,
): number {
  const usedCreatedAt = new Set(
    items
      .filter((item) => item.id !== excludeItemId)
      .map((item) => item.createdAt),
  );

  let createdAt = preferredCreatedAt;
  while (usedCreatedAt.has(createdAt)) {
    createdAt += 1;
  }

  return createdAt;
}

export function hasDuplicateCreatedAt(
  items: Array<{ createdAt: number }>,
): boolean {
  const seen = new Set<number>();

  return items.some((item) => {
    if (seen.has(item.createdAt)) {
      return true;
    }

    seen.add(item.createdAt);
    return false;
  });
}
