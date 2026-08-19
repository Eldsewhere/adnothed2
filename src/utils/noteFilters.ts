import dayjs from "dayjs";
import type { NoteFilters } from "../types";
import { dateRegex, formatDate } from "./formatTimestamp";
import { containsEmail, containsNumbers, containsUrl } from "./textPatterns";

const yearRegex = /^\d{4}$/;
const yearMonthRegex = /^\d{4}-\d{2}$/;

export const NO_LABEL_FILTER_VALUE = "__none__";

export const emptyNoteFilters: NoteFilters = {
  labelId: "",
  text: "",
  date: "",
  endDate: "",
  hasNumber: false,
  isOneWord: false,
  indexAt: "",
  dueDate: "",
  hasDue: false,
  weekday: null,
};

export type ParsedTextFilters = {
  query: string;
  indexAt: number | null;
  wordCount: number | null;
  lineCount: number | null;
  exactLength: number | null;
  minLength: number | null;
  maxLength: number | null;
  fullDate: string | null;
  yearMonth: string | null;
  year: string | null;
  minDate: string | null;
  maxDate: string | null;
  dueFullDate: string | null;
  dueYearMonth: string | null;
  dueYear: string | null;
  minDueDate: string | null;
  maxDueDate: string | null;
  withNumbers: boolean;
  withUrl: boolean;
  withEmail: boolean;
  withBullets: boolean;
  withCheckboxes: boolean;
  withDueDate: boolean;
  withPriority: boolean;
  withLabel: boolean;
};

const defaultParsedTextFilters: ParsedTextFilters = {
  query: "",
  indexAt: null,
  wordCount: null,
  lineCount: null,
  exactLength: null,
  minLength: null,
  maxLength: null,
  fullDate: null,
  yearMonth: null,
  year: null,
  minDate: null,
  maxDate: null,
  dueFullDate: null,
  dueYearMonth: null,
  dueYear: null,
  minDueDate: null,
  maxDueDate: null,
  withNumbers: false,
  withUrl: false,
  withEmail: false,
  withBullets: false,
  withCheckboxes: false,
  withDueDate: false,
  withPriority: false,
  withLabel: false,
};

function toPositiveInt(value: string): number | null {
  const parsed = Number(value.trim());
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function parseTextFilters(rawText: string): ParsedTextFilters {
  const parsed = { ...defaultParsedTextFilters };
  const queryParts: string[] = [];
  const parts = rawText.split(";");

  for (let i = 0; i < parts.length; i += 1) {
    const part = parts[i];
    const isCompletedSegment = i < parts.length - 1 || rawText.endsWith(";");
    const segment = part.trim();
    if (!segment) {
      continue;
    }

    if (segment.startsWith("/") && !isCompletedSegment) {
      continue;
    }

    if (!segment.startsWith("/")) {
      queryParts.push(segment.replace(/\s+/g, ""));
      continue;
    }

    const command = segment.slice(1).trim();
    const commandMatch = command.match(/^([a-zA-Z]+):([^\s].*)$/);
    if (!commandMatch) {
      continue;
    }

    const key = commandMatch[1].toLowerCase();
    const value = commandMatch[2].trim();

    if (key === "index") {
      parsed.indexAt = toPositiveInt(value);
      continue;
    }
    if (key === "word") {
      parsed.wordCount = toPositiveInt(value);
      continue;
    }
    if (key === "lines") {
      parsed.lineCount = toPositiveInt(value);
      continue;
    }
    if (key === "length") {
      parsed.exactLength = toPositiveInt(value);
      continue;
    }
    if (key === "minlength") {
      parsed.minLength = toPositiveInt(value);
      continue;
    }
    if (key === "maxlength") {
      parsed.maxLength = toPositiveInt(value);
      continue;
    }
    if (key === "date") {
      if (dateRegex.test(value)) {
        parsed.fullDate = value;
        continue;
      }
      if (yearMonthRegex.test(value)) {
        parsed.yearMonth = value;
        continue;
      }
      if (yearRegex.test(value)) {
        parsed.year = value;
      }
      continue;
    }
    if (key === "mindate") {
      parsed.minDate = dateRegex.test(value) ? value : null;
      continue;
    }
    if (key === "maxdate") {
      parsed.maxDate = dateRegex.test(value) ? value : null;
      continue;
    }
    if (key === "due") {
      if (dateRegex.test(value)) {
        parsed.dueFullDate = value;
        continue;
      }
      if (yearMonthRegex.test(value)) {
        parsed.dueYearMonth = value;
        continue;
      }
      if (yearRegex.test(value)) {
        parsed.dueYear = value;
      }
      continue;
    }
    if (key === "mindue") {
      parsed.minDueDate = dateRegex.test(value) ? value : null;
      continue;
    }
    if (key === "maxdue") {
      parsed.maxDueDate = dateRegex.test(value) ? value : null;
      continue;
    }
    if (key === "with") {
      const token = value.toLowerCase();
      if (token === "numbers") {
        parsed.withNumbers = true;
        continue;
      }
      if (token === "url") {
        parsed.withUrl = true;
        continue;
      }
      if (token === "email") {
        parsed.withEmail = true;
        continue;
      }
      if (token === "bullets") {
        parsed.withBullets = true;
        continue;
      }
      if (token === "checkboxes") {
        parsed.withCheckboxes = true;
        continue;
      }
      if (token === "due") {
        parsed.withDueDate = true;
        continue;
      }
      if (token === "priority") {
        parsed.withPriority = true;
        continue;
      }
      if (token === "label") {
        parsed.withLabel = true;
        continue;
      }
    }

    // Unknown slash commands are ignored so mistyped command drafts do not filter.
  }

  parsed.query = queryParts.join(" ").trim();
  return parsed;
}

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
}

function countLines(text: string): number {
  return text.split(/\r?\n/).length;
}

function isDueTodayOrTomorrow(timestamp?: number): boolean {
  if (timestamp === undefined) {
    return false;
  }

  const startOfDay = dayjs.unix(timestamp).startOf("day");
  const today = dayjs().startOf("day");
  const tomorrow = today.add(1, "day");

  return startOfDay.isSame(today, "day") || startOfDay.isSame(tomorrow, "day");
}

export function matchesTextFilters(
  text: string,
  createdAt: number,
  index: number,
  sortedNotesLength: number,
  parsed: ParsedTextFilters,
  due?: number,
  labelId: string | null = null,
  isPinned = false,
): boolean {
  if (
    parsed.query &&
    !text.toLowerCase().includes(parsed.query.toLowerCase())
  ) {
    return false;
  }

  if (parsed.indexAt !== null && index !== sortedNotesLength - parsed.indexAt) {
    return false;
  }

  if (parsed.wordCount !== null && countWords(text) !== parsed.wordCount) {
    return false;
  }

  if (parsed.lineCount !== null && countLines(text) !== parsed.lineCount) {
    return false;
  }

  if (parsed.exactLength !== null && text.length !== parsed.exactLength) {
    return false;
  }

  if (parsed.minLength !== null && text.length < parsed.minLength) {
    return false;
  }

  if (parsed.maxLength !== null && text.length > parsed.maxLength) {
    return false;
  }

  const noteDate = formatDate(createdAt);

  if (parsed.fullDate !== null && noteDate !== parsed.fullDate) {
    return false;
  }

  if (parsed.yearMonth !== null && !noteDate.startsWith(`${parsed.yearMonth}-`)) {
    return false;
  }

  if (parsed.year !== null && !noteDate.startsWith(`${parsed.year}-`)) {
    return false;
  }

  if (parsed.minDate !== null && noteDate < parsed.minDate) {
    return false;
  }

  if (parsed.maxDate !== null && noteDate > parsed.maxDate) {
    return false;
  }

  const dueDate = due === undefined ? null : formatDate(due);

  if (parsed.dueFullDate !== null && dueDate !== parsed.dueFullDate) {
    return false;
  }

  if (
    parsed.dueYearMonth !== null &&
    (dueDate === null || !dueDate.startsWith(`${parsed.dueYearMonth}-`))
  ) {
    return false;
  }

  if (
    parsed.dueYear !== null &&
    (dueDate === null || !dueDate.startsWith(`${parsed.dueYear}-`))
  ) {
    return false;
  }

  if (
    parsed.minDueDate !== null &&
    (dueDate === null || dueDate < parsed.minDueDate)
  ) {
    return false;
  }

  if (
    parsed.maxDueDate !== null &&
    (dueDate === null || dueDate > parsed.maxDueDate)
  ) {
    return false;
  }

  if (parsed.withNumbers && !containsNumbers(text)) {
    return false;
  }

  if (parsed.withUrl && !containsUrl(text)) {
    return false;
  }

  if (parsed.withEmail && !containsEmail(text)) {
    return false;
  }

  if (parsed.withBullets && !text.includes("•")) {
    return false;
  }

  if (parsed.withCheckboxes && !text.includes("[]") && !text.includes("[x]")) {
    return false;
  }

  if (parsed.withDueDate) {
    const todayUnix = dayjs().startOf("day").unix();
    if (due === undefined || due < todayUnix) {
      return false;
    }
  }

  if (parsed.withPriority && !isPinned && !isDueTodayOrTomorrow(due)) {
    return false;
  }

  if (parsed.withLabel && labelId === null) {
    return false;
  }

  return true;
}
