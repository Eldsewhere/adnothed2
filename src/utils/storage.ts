import type { Category, Item } from '../types';

const STORAGE_KEY = 'adnothed:state';

type PersistedState = {
  categories: Category[];
  items: Item[];
};

const emptyState: PersistedState = { categories: [], items: [] };

export function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return emptyState;
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      categories: parsed.categories ?? [],
      items: parsed.items ?? [],
    };
  } catch {
    return emptyState;
  }
}

export function savePersistedState(state: PersistedState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPersistedState(): void {
  localStorage.removeItem(STORAGE_KEY);
}
