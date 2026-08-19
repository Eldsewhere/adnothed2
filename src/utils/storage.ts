import { mdiLabelOff } from "@mdi/js";
import { mdiIconOptions } from "../hooks/useMdiIconOptions";
import { AnyPersistedStateSchema } from "./schemas";
import type { Label, Note, Status, StatusFormat } from "../types";
import { getUniqueCreatedAt, normalizeCreatedAt } from "./noteTimestamps";
import { createEmojiIconOptionFromName } from "./emojiIconOptions";
import { createLetterIconOptionFromName } from "./letterIconOptions";

type PersistedLabel = {
  name: string;
  icon: string;
  color?: string;
};

type PersistedStatus = {
  name: string;
  emoji: string;
  format: StatusFormat;
};

type PersistedNote = {
  icon?: string | null;
  text: string;
  emoji?: string;
  time: number;
  due?: number | null;
  pinned?: boolean;
};

type PersistedState = {
  labels: PersistedLabel[];
  statuses: PersistedStatus[];
  notes: PersistedNote[];
};

type ParseResult = {
  state: PersistedState;
  error: string | null;
};

export const DEFAULT_FILE_NAME = "adnothed-state.json";
const STORAGE_KEY = "adnothed-local-storage";
const FILE_NAME_STORAGE_KEY = `${STORAGE_KEY}:fileName`;
const GOOGLE_DRIVE_STORAGE_KEY = "adnothed-google-drive-enabled";

const emptyPersistedState: PersistedState = { labels: [], statuses: [], notes: [] };
const emptyAppState: { labels: Label[]; statuses: Status[]; notes: Note[] } = {
  labels: [],
  statuses: [],
  notes: [],
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

function resolveIconOption(name: string): Label["icon"] {
  const emojiOption = createEmojiIconOptionFromName(name);
  if (emojiOption) {
    return emojiOption;
  }

  const letterOption = createLetterIconOptionFromName(name);
  if (letterOption) {
    return letterOption;
  }

  const option = mdiIconOptions.find((note) => note.name === name);
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
    path: mdiLabelOff,
  };
}

function normalizeNotes(notes: PersistedNote[]): Note[] {
  const normalized: Note[] = [];

  for (const note of notes) {
    const createdAt = getUniqueCreatedAt(
      normalized,
      normalizeCreatedAt(note.time),
    );

    normalized.push({
      id: String(createdAt),
      labelId: note.icon ?? null,
      text: note.text,
      createdAt,
      ...(note.emoji ? { emoji: note.emoji } : {}),
      ...(note.due !== undefined && note.due !== null ? { due: note.due } : {}),
      ...(note.pinned ? { pinned: note.pinned } : {}),
    });
  }

  return normalized;
}

function toPersistedNote(note: {
  icon?: string | null;
  text: string;
  emoji?: string;
  time: number;
  due?: number | null;
  pinned?: boolean;
}): PersistedNote {
  const icon = note.icon ?? undefined;

  return {
    ...(icon ? { icon } : {}),
    text: note.text,
    ...(note.emoji ? { emoji: note.emoji } : {}),
    time: normalizeCreatedAt(note.time),
    ...(note.due !== undefined ? { due: note.due } : {}),
    ...(note.pinned ? { pinned: note.pinned } : {}),
  };
}

function normalizePersistedState(state: PersistedState): PersistedState {
  return {
    labels: state.labels.map((label) => ({
      name: label.name,
      icon: label.icon,
      ...(label.color ? { color: label.color } : {}),
    })),
    statuses: (state.statuses ?? []).map((status) => ({
      name: status.name,
      emoji: status.emoji,
      format: status.format,
    })),
    notes: state.notes.map(toPersistedNote),
  };
}

export function serializeState(state: {
  labels: Label[];
  statuses: Status[];
  notes: Note[];
}): PersistedState {
  return {
    labels: state.labels.map((label) => ({
      name: label.name,
      icon: label.icon.name,
      ...(label.color ? { color: label.color } : {}),
    })),
    statuses: state.statuses.map((status) => ({
      name: status.name,
      emoji: status.emoji,
      format: status.format,
    })),
    notes: state.notes.map((note) => {
      const { labelId, text, emoji, createdAt, due, pinned } =
        stripTransientNoteFields(note);
      return toPersistedNote({
        icon: labelId,
        text,
        emoji,
        time: createdAt,
        due,
        pinned,
      });
    }),
  };
}

function stripTransientNoteFields<T extends Note>(note: T): T {
  const { updatedAt: _updatedAt, ...rest } = note;
  return rest as T;
}

function deserializeState(state: PersistedState): {
  labels: Label[];
  statuses: Status[];
  notes: Note[];
} {
  return {
    labels: state.labels.map((label) => ({
      id: label.icon,
      name: label.name,
      icon: resolveIconOption(label.icon),
      ...(label.color ? { color: label.color } : {}),
    })),
    statuses: (state.statuses ?? []).map((status) => ({
      id: status.emoji,
      name: status.name,
      emoji: status.emoji,
      format: status.format,
    })),
    notes: normalizeNotes(state.notes),
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
  labels: Label[];
  statuses: Status[];
  notes: Note[];
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
  labels: Label[];
  statuses: Status[];
  notes: Note[];
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
    labels: Label[];
    statuses: Status[];
    notes: Note[];
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

function getGoogleDriveQueryValue(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return new URLSearchParams(window.location.search).get("googledrive");
  } catch {
    return null;
  }
}

function isGoogleDriveQueryEnabled(): boolean {
  const value = getGoogleDriveQueryValue()?.toLowerCase();
  return value === "true" || value === "1";
}

function consumeGoogleDriveQueryFlag(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const cleanUrl = new URL(window.location.href);
    if (!cleanUrl.searchParams.has("googledrive")) {
      return;
    }

    cleanUrl.searchParams.delete("googledrive");
    const nextUrl = `${cleanUrl.pathname}${cleanUrl.search}${cleanUrl.hash}`;
    window.history.replaceState({}, "", nextUrl || "/");
  } catch {
    // Ignore malformed URLs and keep the current page state stable.
  }
}

export function isGoogleDriveEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storageEnabled =
      window.localStorage.getItem(GOOGLE_DRIVE_STORAGE_KEY)?.toLowerCase() ===
      "true";

    return isGoogleDriveQueryEnabled() || storageEnabled;
  } catch {
    return false;
  }
}

export function enableGoogleDriveFromQuery(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    if (isGoogleDriveQueryEnabled()) {
      window.localStorage.setItem(GOOGLE_DRIVE_STORAGE_KEY, "true");
      consumeGoogleDriveQueryFlag();
    }

    return isGoogleDriveEnabled();
  } catch {
    return false;
  }
}

export async function clearPersistedState(): Promise<void> {
  clearStoredValue();
}
