import type { IconOption } from "../types";

const EMOJI_ICON_PREFIX = "emoji:";

export function createEmojiIconOption(emoji: string): IconOption {
  return {
    name: `${EMOJI_ICON_PREFIX}${emoji}`,
    label: `Emoji: ${emoji}`,
    path: "",
  };
}

export function createEmojiIconOptionFromName(name: string): IconOption | null {
  if (!name.startsWith(EMOJI_ICON_PREFIX)) {
    return null;
  }

  const emoji = name.slice(EMOJI_ICON_PREFIX.length);
  return emoji ? createEmojiIconOption(emoji) : null;
}

export function getEmojiIcon(iconName: string): string | null {
  return createEmojiIconOptionFromName(iconName)?.name.slice(
    EMOJI_ICON_PREFIX.length,
  ) ?? null;
}