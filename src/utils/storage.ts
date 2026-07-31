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

const emptyPersistedState: PersistedState = { categories: [], items: [] };
const emptyAppState: { categories: Category[]; items: Item[] } = {
  categories: [],
  items: [],
};

let currentFileHandle: FileSystemFileHandle | null = null;

type FileSystemFileHandle = {
  name: string;
  getFile(): Promise<File>;
  createWritable(options?: {
    keepExistingData?: boolean;
  }): Promise<FileSystemWritableFileStream>;
};

type FileSystemWritableFileStream = {
  write(
    data: string | Blob | ArrayBufferView | ArrayBuffer | BlobPart[],
  ): Promise<void>;
  close(): Promise<void>;
};

type SaveFilePickerOptions = {
  suggestedName?: string;
  types?: Array<{
    description?: string;
    accept: Record<string, string[]>;
  }>;
  excludeAcceptAllOption?: boolean;
  startIn?: unknown;
};

function getShowSaveFilePicker():
  | ((options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return (window as any).showSaveFilePicker;
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

function isFileSystemAccessSupported(): boolean {
  return !!getShowSaveFilePicker() || !!getShowOpenFilePicker();
}

function setCurrentFileHandle(handle: FileSystemFileHandle) {
  currentFileHandle = handle;
}

function getCurrentFileHandle(): FileSystemFileHandle | null {
  return currentFileHandle;
}

export async function getPersistedFileName(): Promise<string> {
  try {
    return getCurrentFileHandle()?.name ?? DEFAULT_FILE_NAME;
  } catch {
    return DEFAULT_FILE_NAME;
  }
}

async function chooseStateFile(
  suggestedName: string = DEFAULT_FILE_NAME,
): Promise<FileSystemFileHandle | null> {
  const picker = getShowSaveFilePicker();
  if (!picker) {
    return null;
  }

  try {
    return await picker({
      suggestedName,
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
  } catch {
    return null;
  }
}

async function chooseExistingStateFile(
  suggestedName: string = DEFAULT_FILE_NAME,
): Promise<FileSystemFileHandle | null> {
  const openPicker = getShowOpenFilePicker();
  if (!openPicker) {
    return null;
  }

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
    return handles[0] ?? null;
  } catch {
    return null;
  }
}

export async function openPersistedStateFile(
  suggestedFileName: string = DEFAULT_FILE_NAME,
): Promise<{
  categories: Category[];
  items: Item[];
  fileName: string;
} | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }

  const handle = await chooseExistingStateFile(suggestedFileName);
  if (!handle) {
    return null;
  }

  setCurrentFileHandle(handle);

  const file = await handle.getFile();
  const raw = await file.text();
  const state = deserializeState(parseState(raw));
  return { ...state, fileName: handle.name };
}

export async function createPersistedStateFile(
  suggestedFileName: string = DEFAULT_FILE_NAME,
): Promise<{ fileName: string } | null> {
  if (!isFileSystemAccessSupported()) {
    return null;
  }

  const handle = await chooseStateFile(
    suggestedFileName.trim() || DEFAULT_FILE_NAME,
  );
  if (!handle) {
    return null;
  }

  setCurrentFileHandle(handle);

  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(emptyPersistedState, null, 2));
    await writable.close();
    return { fileName: handle.name };
  } catch {
    currentFileHandle = null;
    return null;
  }
}

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

export function hasPersistedStateFile(): boolean {
  return !!getCurrentFileHandle();
}

export async function loadPersistedState(): Promise<{
  categories: Category[];
  items: Item[];
  fileName: string;
}> {
  try {
    if (!isFileSystemAccessSupported()) {
      return { ...emptyAppState, fileName: DEFAULT_FILE_NAME };
    }

    const handle = getCurrentFileHandle();
    if (!handle) {
      return { ...emptyAppState, fileName: DEFAULT_FILE_NAME };
    }

    const file = await handle.getFile();
    const raw = await file.text();
    return { ...deserializeState(parseState(raw)), fileName: handle.name };
  } catch {
    currentFileHandle = null;
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

  if (!isFileSystemAccessSupported()) {
    return;
  }

  let handle = getCurrentFileHandle();
  if (!handle) {
    handle = await chooseStateFile(
      suggestedFileName.trim() || DEFAULT_FILE_NAME,
    );
    if (!handle) {
      return;
    }
    setCurrentFileHandle(handle);
  }

  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(serialized));
    await writable.close();
  } catch {
    currentFileHandle = null;
  }
}

export async function clearPersistedState(): Promise<void> {
  currentFileHandle = null;
}
