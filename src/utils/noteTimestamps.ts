export function getUniqueCreatedAt(
  notes: Array<{ id: string; time: number }>,
  preferredCreatedAt: number = Math.floor(Date.now() / 1000),
  excludenoteId?: string,
): number {
  const usedCreatedAt = new Set(
    notes
      .filter((note) => note.id !== excludenoteId)
      .map((note) => normalizeCreatedAt(note.time)),
  );

  let time = normalizeCreatedAt(preferredCreatedAt);
  while (usedCreatedAt.has(time)) {
    time += 1;
  }

  return time;
}

export function normalizeCreatedAt(time: number): number {
  return time >= 1_000_000_000_000 ? Math.floor(time / 1000) : Math.floor(time);
}

export function hasDuplicateCreatedAt(notes: Array<{ time: number }>): boolean {
  const seen = new Set<number>();

  return notes.some((note) => {
    const time = normalizeCreatedAt(note.time);
    if (seen.has(time)) {
      return true;
    }

    seen.add(time);
    return false;
  });
}
