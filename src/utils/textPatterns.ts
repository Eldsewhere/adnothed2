const URL_REGEX = /\b((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/[^\s]*)?)/i;
const EMAIL_REGEX = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const NUMBER_ONLY_REGEX = /[0-9]/;

export function containsUrl(text: string): boolean {
  return URL_REGEX.test(text);
}

export function getFirstUrl(text: string): string | null {
  const match = text.match(URL_REGEX);
  if (!match) {
    return null;
  }
  return /^https?:\/\//i.test(match[0]) ? match[0] : `https://${match[0]}`;
}

export function containsEmail(text: string): boolean {
  return EMAIL_REGEX.test(text);
}

export function containsNumbers(text: string): boolean {
  return NUMBER_ONLY_REGEX.test(text);
}

export function splitTextByUrls(
  text: string,
): Array<{ value: string; isUrl: boolean }> {
  const urlRegex = new RegExp(URL_REGEX.source, "gi");
  const parts: Array<{ value: string; isUrl: boolean }> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = urlRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ value: text.slice(lastIndex, match.index), isUrl: false });
    }
    parts.push({ value: match[0], isUrl: /^https?:\/\//i.test(match[0]) });
    lastIndex = urlRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ value: text.slice(lastIndex), isUrl: false });
  }

  return parts.filter((p) => p.value !== "");
}
