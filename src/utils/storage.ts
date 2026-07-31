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

export const STORAGE_KEY = "adnothed:state";
const DB_NAME = "adnothed-state-db";
const DB_VERSION = 1;
const STATE_STORE = "state";
const HANDLE_STORE = "handles";
const HANDLE_KEY = "state-file-handle";
export const DEFAULT_FILE_NAME = "adnothed-state.json";

const emptyPersistedState: PersistedState = { categories: [], items: [] };
const emptyAppState: { categories: Category[]; items: Item[] } = {
  categories: [],
  items: [],
};

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

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE);
      }
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

async function readStateFromIdb(): Promise<PersistedState> {
  const db = await openDb();
  try {
    const tx = db.transaction(STATE_STORE, "readonly");
    const store = tx.objectStore(STATE_STORE);
    return await new Promise((resolve) => {
      const request = store.get(STORAGE_KEY);
      request.onsuccess = () => {
        const raw = request.result as string | null;
        if (!raw) {
          resolve(emptyPersistedState);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          resolve({
            categories: parsed.categories ?? [],
            items: parsed.items ?? [],
          });
        } catch {
          resolve(emptyPersistedState);
        }
      };
      request.onerror = () => resolve(emptyPersistedState);
    });
  } finally {
    db.close();
  }
}

async function writeStateToIdb(state: PersistedState): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STATE_STORE, "readwrite");
    const store = tx.objectStore(STATE_STORE);
    store.put(JSON.stringify(state), STORAGE_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function deleteStateFromIdb(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(STATE_STORE, "readwrite");
    const store = tx.objectStore(STATE_STORE);
    store.delete(STORAGE_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDb();
  try {
    const tx = db.transaction(HANDLE_STORE, "readonly");
    const store = tx.objectStore(HANDLE_STORE);
    return await new Promise((resolve) => {
      const request = store.get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  } finally {
    db.close();
  }
}

async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    const store = tx.objectStore(HANDLE_STORE);
    store.put(handle, HANDLE_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

async function deleteStoredHandle(): Promise<void> {
  const db = await openDb();
  try {
    const tx = db.transaction(HANDLE_STORE, "readwrite");
    const store = tx.objectStore(HANDLE_STORE);
    store.delete(HANDLE_KEY);
    await new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(undefined);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getPersistedFileName(): Promise<string> {
  try {
    const handle = await getStoredHandle();
    return handle?.name ?? DEFAULT_FILE_NAME;
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

export async function loadPersistedState(
  suggestedFileName: string = DEFAULT_FILE_NAME,
): Promise<{
  categories: Category[];
  items: Item[];
}> {
  try {
    if (isFileSystemAccessSupported()) {
      let handle = await getStoredHandle();
      if (handle && handle.name !== suggestedFileName) {
        await deleteStoredHandle();
        handle = null;
      }

      const selectedHandle =
        handle ?? (await chooseStateFile(suggestedFileName));
      if (selectedHandle) {
        if (!handle) {
          await storeHandle(selectedHandle);
        }
        try {
          const file = await selectedHandle.getFile();
          const raw = await file.text();
          return deserializeState(parseState(raw));
        } catch {
          await deleteStoredHandle();
          // fall through to fallback storage
        }
      }
    }

    const idbState = await readStateFromIdb();
    if (idbState.categories.length || idbState.items.length) {
      return deserializeState(idbState);
    }

    return deserializeState(parseState(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return emptyAppState;
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
    if (isFileSystemAccessSupported()) {
      let handle = await getStoredHandle();
      if (!handle) {
        handle = await chooseStateFile(
          suggestedFileName.trim() || DEFAULT_FILE_NAME,
        );
        if (handle) {
          await storeHandle(handle);
        }
      }
      if (handle) {
        try {
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(serialized));
          await writable.close();
          return;
        } catch {
          await deleteStoredHandle();
          // fall back to other storage
        }
      }
    }
  } catch {
    // fall through to fallback storage
  }

  try {
    await writeStateToIdb(serialized);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await deleteStateFromIdb();
    await deleteStoredHandle();
  } catch {
    // ignore
  } finally {
    localStorage.removeItem(STORAGE_KEY);
  }
}
