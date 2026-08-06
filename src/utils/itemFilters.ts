import type { ItemFilters } from "../types";
import { dateRegex, formatDate } from "./formatTimestamp";
import { containsEmail, containsNumbers, containsUrl } from "./textPatterns";

export const NO_CATEGORY_FILTER_VALUE = "__none__";

export const emptyItemFilters: ItemFilters = {
  categoryId: "",
  text: "",
  date: "",
  endDate: "",
  hasNumber: false,
  isOneWord: false,
  indexAt: "",
};

export type ParsedTextFilters = {
  query: string;
  indexAt: number | null;
  wordCount: number | null;
  lineCount: number | null;
  exactLength: number | null;
  minLength: number | null;
  maxLength: number | null;
  exactDate: string | null;
  minDate: string | null;
  maxDate: string | null;
  withNumbers: boolean;
  withUrl: boolean;
  withEmail: boolean;
  withBullets: boolean;
};

const defaultParsedTextFilters: ParsedTextFilters = {
  query: "",
  indexAt: null,
  wordCount: null,
  lineCount: null,
  exactLength: null,
  minLength: null,
  maxLength: null,
  exactDate: null,
  minDate: null,
  maxDate: null,
  withNumbers: false,
  withUrl: false,
  withEmail: false,
  withBullets: false,
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
      queryParts.push(segment);
      continue;
    }

    const command = segment.slice(1).trim();
    const commandMatch = command.match(/^([a-zA-Z]+)\s*:\s*(.+)$/);
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
      parsed.exactDate = dateRegex.test(value) ? value : null;
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

export function matchesTextFilters(
  text: string,
  createdAt: number,
  index: number,
  sortedItemsLength: number,
  parsed: ParsedTextFilters,
): boolean {
  if (
    parsed.query &&
    !text.toLowerCase().includes(parsed.query.toLowerCase())
  ) {
    return false;
  }

  if (parsed.indexAt !== null && index !== sortedItemsLength - parsed.indexAt) {
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

  const itemDate = formatDate(createdAt);

  if (parsed.exactDate !== null && itemDate !== parsed.exactDate) {
    return false;
  }

  if (parsed.minDate !== null && itemDate < parsed.minDate) {
    return false;
  }

  if (parsed.maxDate !== null && itemDate > parsed.maxDate) {
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

  return true;
}
