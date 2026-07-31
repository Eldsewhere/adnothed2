import type { Category, Item } from "../types";

type PersistedState = {
  categories: Category[];
  items: Item[];
};

const STORAGE_KEY = "adnothed:state";
const DB_NAME = "adnothed-state-db";
const DB_VERSION = 1;
const STATE_STORE = "state";
const DEFAULT_FILE_NAME = "adnothed-state.json";

const emptyState: PersistedState = { categories: [], items: [] };

type FileSystemFileHandle = {
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
          resolve(emptyState);
          return;
        }
        try {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          resolve({
            categories: parsed.categories ?? [],
            items: parsed.items ?? [],
          });
        } catch {
          resolve(emptyState);
        }
      };
      request.onerror = () => resolve(emptyState);
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

async function chooseStateFile(): Promise<FileSystemFileHandle | null> {
  const picker = getShowSaveFilePicker();
  if (!picker) {
    return null;
  }

  try {
    return await picker({
      suggestedName: DEFAULT_FILE_NAME,
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

function parseState(raw: string | null): PersistedState {
  if (!raw) {
    return emptyState;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      categories: parsed.categories ?? [],
      items: parsed.items ?? [],
    };
  } catch {
    return emptyState;
  }
}

export async function loadPersistedState(): Promise<PersistedState> {
  try {
    if (isFileSystemAccessSupported()) {
      const handle = await chooseStateFile();
      if (handle) {
        try {
          const file = await handle.getFile();
          const raw = await file.text();
          return parseState(raw);
        } catch {
          // fall through to fallback storage
        }
      }
    }

    const idbState = await readStateFromIdb();
    if (idbState.categories.length || idbState.items.length) {
      return idbState;
    }

    return parseState(localStorage.getItem(STORAGE_KEY));
  } catch {
    return emptyState;
  }
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  try {
    if (isFileSystemAccessSupported()) {
      const handle = await chooseStateFile();
      if (handle) {
        try {
          const writable = await handle.createWritable();
          await writable.write(JSON.stringify(state));
          await writable.close();
          return;
        } catch {
          // fall back to other storage
        }
      }
    }
  } catch {
    // fall through to fallback storage
  }

  try {
    await writeStateToIdb(state);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export async function clearPersistedState(): Promise<void> {
  try {
    await deleteStateFromIdb();
  } catch {
    // ignore
  } finally {
    localStorage.removeItem(STORAGE_KEY);
  }
}
