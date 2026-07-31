import { mdiNoteText } from "@mdi/js";
import { mdiIconOptions } from "../hooks/useMdiIconOptions";
import type { Category, Item } from "../types";

type PersistedCategory = {
  id: string;
  name: string;
  iconName: string;
};

type PersistedState = {
  categories: PersistedCategory[];
  items: Item[];
};

export const DEFAULT_FILE_NAME = "adnothed-state.json";
const STORAGE_KEY = "adnothed-local-storage";
const FILE_NAME_STORAGE_KEY = `${STORAGE_KEY}:fileName`;

const emptyPersistedState: PersistedState = { categories: [], items: [] };
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

function serializeState(state: {
  categories: Category[];
  items: Item[];
}): PersistedState {
  return {
    categories: state.categories.map((category) => ({
      id: category.id,
      name: category.name,
      iconName: category.icon.name,
    })),
    items: state.items,
  };
}

function deserializeState(state: PersistedState): {
  categories: Category[];
  items: Item[];
} {
  return {
    categories: state.categories.map((category) => ({
      id: category.id,
      name: category.name,
      icon: resolveIconOption(category.iconName),
    })),
    items: state.items,
  };
}

function parseState(raw: string | null): PersistedState {
  if (!raw) {
    return emptyPersistedState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      categories: parsed.categories ?? [],
      items: parsed.items ?? [],
    };
  } catch {
    return emptyPersistedState;
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
    const state = deserializeState(parseState(raw));
    const serialized = serializeState(state);
    setStoredValue(JSON.stringify(serialized));
    setStoredFileName(fileName);
    return { ...state, fileName };
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
}> {
  try {
    const raw = getStoredValue();
    const fileName = await getPersistedFileName();
    return { ...deserializeState(parseState(raw)), fileName };
  } catch {
    clearStoredValue();
    return { ...emptyAppState, fileName: DEFAULT_FILE_NAME };
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
