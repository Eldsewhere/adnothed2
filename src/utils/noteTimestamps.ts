export function getUniqueCreatedAt(
  notes: Array<{ id: string; createdAt: number }>,
  preferredCreatedAt: number = Math.floor(Date.now() / 1000),
  excludenoteId?: string,
): number {
  const usedCreatedAt = new Set(
    notes
      .filter((note) => note.id !== excludenoteId)
      .map((note) => normalizeCreatedAt(note.createdAt)),
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
  notes: Array<{ createdAt: number }>,
): boolean {
  const seen = new Set<number>();

  return notes.some((note) => {
    const createdAt = normalizeCreatedAt(note.createdAt);
    if (seen.has(createdAt)) {
      return true;
    }

    seen.add(createdAt);
    return false;
  });
}
