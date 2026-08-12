import { mdiNoteText } from "@mdi/js";
import { mdiIconOptions } from "../hooks/useMdiIconOptions";
import { AnyPersistedStateSchema } from "./schemas";
import type { Category, Item } from "../types";
import { getUniqueCreatedAt, normalizeCreatedAt } from "./itemTimestamps";

type PersistedLabel = {
  name: string;
  icon: string;
};

type PersistedNote = {
  icon?: string | null;
  text: string;
  time: number;
  due?: number | null;
};

type PersistedState = {
  labels: PersistedLabel[];
  notes: PersistedNote[];
};

type LegacyPersistedState = {
  categories: Array<{ name: string; iconName: string }>;
  items: Array<{ categoryId: string | null; text: string; createdAt: number }>;
};

type ParseResult = {
  state: PersistedState;
  error: string | null;
};

export const DEFAULT_FILE_NAME = "adnothed-state.json";
const STORAGE_KEY = "adnothed-local-storage";
const FILE_NAME_STORAGE_KEY = `${STORAGE_KEY}:fileName`;

const emptyPersistedState: PersistedState = { labels: [], notes: [] };
const emptyAppState: { categories: Category[]; items: Item[] } = {
  categories: [],
  items: [],
};

function getStoredValue(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
}

function setStoredValue(value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, value);
}

function setStoredFileName(value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FILE_NAME_STORAGE_KEY, value);
}

function clearStoredValue(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(FILE_NAME_STORAGE_KEY);
}

function getShowOpenFilePicker():
  | ((options?: {
      multiple?: boolean;
      types?: Array<{ description?: string; accept: Record<string, string[]> }>;
      excludeAcceptAllOption?: boolean;
      startIn?: unknown;
    }) => Promise<FileSystemFileHandle[]>)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return (window as any).showOpenFilePicker;
}

type FileSystemFileHandle = {
  name: string;
  getFile(): Promise<File>;
};

function resolveIconOption(name: string): Category["icon"] {
  const option = mdiIconOptions.find((item) => item.name === name);
  if (option) {
    return option;
  }

  const label = name
    .replace(/^mdi/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();

  return {
    name,
    label,
    path: mdiNoteText,
  };
}

function normalizeItems(notes: PersistedNote[]): Item[] {
  const normalized: Item[] = [];

  for (const note of notes) {
    const createdAt = getUniqueCreatedAt(
      normalized,
      normalizeCreatedAt(note.time),
    );

    normalized.push({
      id: String(createdAt),
      categoryId: note.icon ?? null,
      text: note.text,
      createdAt,
      ...(note.due !== undefined && note.due !== null ? { due: note.due } : {}),
    });
  }

  return normalized;
}

function toPersistedNote(note: {
  icon?: string | null;
  text: string;
  time: number;
  due?: number | null;
}): PersistedNote {
  const icon = note.icon ?? undefined;

  return {
    ...(icon ? { icon } : {}),
    text: note.text,
    time: normalizeCreatedAt(note.time),
    ...(note.due !== undefined ? { due: note.due } : {}),
  };
}

function normalizePersistedState(
  state: PersistedState | LegacyPersistedState,
): PersistedState {
  if ("labels" in state) {
    return {
      labels: state.labels.map((label) => ({
        name: label.name,
        icon: label.icon,
      })),
      notes: state.notes.map(toPersistedNote),
    };
  }

  // TODO: remove this migration path after the legacy JSON format is retired.
  return {
    labels: state.categories.map((category) => ({
      name: category.name,
      icon: category.iconName,
    })),
    notes: state.items.map((item) =>
      toPersistedNote({
        icon: item.categoryId,
        text: item.text,
        time: item.createdAt,
      }),
    ),
  };
}

export function serializeState(state: {
  categories: Category[];
  items: Item[];
}): PersistedState {
  return {
    // Persist the renamed label shape; keep the old parser only for compatibility.
    labels: state.categories.map((category) => ({
      name: category.name,
      icon: category.icon.name,
    })),
    // Persist the renamed note shape; keep the old parser only for compatibility.
    notes: state.items.map(({ categoryId, text, createdAt, due }) =>
      toPersistedNote({
        icon: categoryId,
        text,
        time: createdAt,
        due,
      }),
    ),
  };
}

function deserializeState(state: PersistedState): {
  categories: Category[];
  items: Item[];
} {
  return {
    // Recreate runtime categories from the renamed persisted label shape.
    categories: state.labels.map((label) => ({
      id: label.icon,
      name: label.name,
      icon: resolveIconOption(label.icon),
    })),
    items: normalizeItems(state.notes),
  };
}

function parseState(raw: string | null): ParseResult {
  if (!raw) {
    return { state: emptyPersistedState, error: null };
  }

  try {
    const parsed = JSON.parse(raw);
    const result = AnyPersistedStateSchema.safeParse(parsed);
    if (!result.success) {
      return {
        state: emptyPersistedState,
        error: `Failed to parse saved data: ${result.error.message}`,
      };
    }

    return {
      state: normalizePersistedState(result.data),
      error: null,
    };
  } catch (error) {
    return {
      state: emptyPersistedState,
      error: `Failed to parse saved data: ${(error as Error)?.message ?? "Invalid JSON"}`,
    };
  }
}

export async function getPersistedFileName(): Promise<string> {
  try {
    if (typeof window === "undefined") {
      return DEFAULT_FILE_NAME;
    }

    return (
      window.localStorage.getItem(FILE_NAME_STORAGE_KEY)?.trim() ||
      DEFAULT_FILE_NAME
    );
  } catch {
    return DEFAULT_FILE_NAME;
  }
}

export async function openPersistedStateFile(
  suggestedFileName: string = DEFAULT_FILE_NAME,
): Promise<{
  categories: Category[];
  items: Item[];
  fileName: string;
  parseError: string | null;
} | null> {
  const openPicker = getShowOpenFilePicker();

  let file: File | null = null;
  let fileName = suggestedFileName.trim() || DEFAULT_FILE_NAME;

  if (openPicker) {
    try {
      const handles = await openPicker({
        multiple: false,
        types: [
          {
            description: "Adnothed state file",
            accept: {
              "application/json": [".json"],
            },
          },
        ],
        excludeAcceptAllOption: true,
      });

      const handle = handles[0];
      if (!handle) {
        return null;
      }

      file = await handle.getFile();
      fileName = handle.name || fileName;
    } catch {
      return null;
    }
  } else {
    try {
      const picker = document.createElement("input");
      picker.type = "file";
      picker.accept = ".json,application/json";

      const selected = await new Promise<File | null>((resolve) => {
        picker.onchange = () => {
          const selectedFile = picker.files?.[0] ?? null;
          resolve(selectedFile);
        };
        picker.click();
      });

      if (!selected) {
        return null;
      }

      file = selected;
      fileName = selected.name || fileName;
    } catch {
      return null;
    }
  }

  try {
    const raw = await file.text();
    const parseResult = parseState(raw);
    const state = deserializeState(parseResult.state);
    const serialized = serializeState(state);
    setStoredValue(JSON.stringify(serialized));
    setStoredFileName(fileName);
    return { ...state, fileName, parseError: parseResult.error };
  } catch {
    return null;
  }
}

export function hasPersistedStateFile(): boolean {
  return !!getStoredValue();
}

export async function loadPersistedState(): Promise<{
  categories: Category[];
  items: Item[];
  fileName: string;
  parseError: string | null;
}> {
  try {
    const raw = getStoredValue();
    const fileName = await getPersistedFileName();
    const parseResult = parseState(raw);
    return {
      ...deserializeState(parseResult.state),
      fileName,
      parseError: parseResult.error,
    };
  } catch {
    clearStoredValue();
    return { ...emptyAppState, fileName: DEFAULT_FILE_NAME, parseError: null };
  }
}

export async function savePersistedState(
  state: {
    categories: Category[];
    items: Item[];
  },
  suggestedFileName: string = DEFAULT_FILE_NAME,
): Promise<void> {
  const serialized = serializeState(state);

  try {
    setStoredValue(JSON.stringify(serialized));
    setStoredFileName(suggestedFileName.trim() || DEFAULT_FILE_NAME);
  } catch {
    clearStoredValue();
  }
}

export async function clearPersistedState(): Promise<void> {
  clearStoredValue();
}
