import type { IconOption } from "../types";

const LETTER_ICON_PREFIX = "letter:";
const LETTER_PATTERN = /^[A-Z]{1,2}$/;
const NUMBER_PATTERN = /^\d{1,2}$/;
const LETTER_NUMBER_PATTERN = /^[A-Z]\d$/;

function normalizeAvatarText(value: string): string | null {
  const normalized = value.trim().replace(/\s+/g, "").toUpperCase();

  if (LETTER_PATTERN.test(normalized)) {
    return normalized;
  }

  if (LETTER_NUMBER_PATTERN.test(normalized)) {
    return normalized;
  }

  if (NUMBER_PATTERN.test(normalized)) {
    const parsed = Number.parseInt(normalized, 10);
    if (Number.isNaN(parsed) || parsed < 0 || parsed > 99) {
      return null;
    }
    return String(parsed);
  }

  if (normalized.length === 0) {
    return null;
  }

  return null;
}

export function createLetterIconOptionFromInput(input: string): IconOption | null {
  const avatarText = normalizeAvatarText(input);
  if (!avatarText) {
    return null;
  }

  return {
    name: `${LETTER_ICON_PREFIX}${avatarText}`,
    label: `Avatar: ${avatarText}`,
    path: "",
  };
}

export function createLetterIconOptionFromName(name: string): IconOption | null {
  if (!name.startsWith(LETTER_ICON_PREFIX)) {
    return null;
  }

  const avatarText = normalizeAvatarText(name.slice(LETTER_ICON_PREFIX.length));
  if (!avatarText) {
    return null;
  }

  return {
    name: `${LETTER_ICON_PREFIX}${avatarText}`,
    label: `Avatar: ${avatarText}`,
    path: "",
  };
}

export function getLetterAvatarText(iconName: string): string | null {
  const option = createLetterIconOptionFromName(iconName);
  if (!option) {
    return null;
  }

  return option.name.slice(LETTER_ICON_PREFIX.length);
}